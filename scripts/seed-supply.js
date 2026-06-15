const { exec } = require('child_process');
const mongo = require('mongodb').MongoClient;

function seedSupply(attempt) {
  attempt = attempt || 1;
  const id = 'SEED-' + attempt;
  
  exec('/usr/local/bin/smartcash-cli -conf=/etc/smartcash3/smartcash.conf -datadir=/var/lib/smartcash3 gettxoutsetinfo 2>/dev/null', { timeout: 120000 }, (err, stdout) => {
    let supply = 0;
    try {
      const s = JSON.parse(stdout);
      if (s && s.total_amount > 0) supply = s.total_amount;
    } catch(e) {}
    
    if (supply < 1000000 && attempt < 30) {
      console.log(id + ' RPC not ready (supply=' + supply + '), retry in 10s...');
      setTimeout(() => seedSupply(attempt + 1), 10000);
      return;
    }
    
    if (supply < 1000000) supply = 3167797400; // fallback
    
    mongo.connect('mongodb://127.0.0.1:27017/smartcash3', (err, client) => {
      client.db().collection('coinstats').updateOne({}, { $set: { supply: supply } }, { upsert: true }, () => {
        console.log(id + ' Supply seeded: ' + supply);
        client.close();
        process.exit(0);
      });
    });
  });
}

seedSupply();
