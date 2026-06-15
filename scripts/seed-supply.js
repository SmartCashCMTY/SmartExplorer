const { exec } = require('child_process');
const mongo = require('mongodb').MongoClient;
const url = 'mongodb://127.0.0.1:27017/smartcash3';

function populate(attempt) {
  attempt = attempt || 1;
  const id = 'SEED-' + attempt;
  
  exec('/usr/local/bin/smartcash-cli -conf=/etc/smartcash3/smartcash.conf -datadir=/var/lib/smartcash3 gettxoutsetinfo 2>/dev/null', { timeout: 120000 }, (err, stdout) => {
    let supply = 0, height = 0, txCount = 0;
    try {
      const s = JSON.parse(stdout);
      if (s && s.total_amount > 0) {
        supply = s.total_amount;
        height = s.height || 0;
        txCount = s.transactions || 0;
      }
    } catch(e) {}
    
    if (supply < 1000000 && attempt < 30) {
      console.log(id + ' RPC not ready (supply=' + supply + '), retry in 10s...');
      setTimeout(() => populate(attempt + 1), 10000);
      return;
    }
    
    if (supply < 1000000) supply = 3167797400;
    
    mongo.connect(url, (err, client) => {
      const db = client.db();
      db.collection('coinstats').updateOne({}, { $set: { supply: supply } }, { upsert: true }, () => {});
      db.collection('stats').updateOne({}, { $set: { count: height, supply: supply } }, { upsert: true }, () => {
        console.log(id + ' Supply: ' + supply + ' Height: ' + height + ' TXes: ' + txCount);
        client.close();
        process.exit(0);
      });
    });
  });
}

populate();
