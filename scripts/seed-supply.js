const { exec } = require('child_process');

function populate(attempt) {
  attempt = attempt || 1;
  
  exec('/usr/local/bin/smartcash-cli -conf=/etc/smartcash3/smartcash.conf -datadir=/var/lib/smartcash3 gettxoutsetinfo 2>/dev/null', { timeout: 120000 }, (err, stdout) => {
    let supply = 0;
    try { const s = JSON.parse(stdout); if (s && s.total_amount > 0) supply = s.total_amount; } catch(e) {}
    
    if (supply < 1000000 && attempt < 30) {
      console.log('SEED-' + attempt + ': RPC not ready, retry in 10s...');
      setTimeout(() => populate(attempt + 1), 10000);
      return;
    }
    if (supply < 1000000) supply = 3167797400;
    
    // Use mongoose from explorer's node_modules
    const mongoose = require('/opt/smartcash3/explorer/node_modules/mongoose');
    const dbString = 'mongodb://127.0.0.1:27017/smartcash3';
    
    mongoose.connect(dbString).then(() => {
      return mongoose.connection.db.collection('coinstats').updateOne(
        {}, { $set: { supply: supply } }, { upsert: true }
      );
    }).then(() => {
      console.log('SEED-' + attempt + ': Supply seeded = ' + supply);
      mongoose.disconnect();
      process.exit(0);
    }).catch(e => {
      console.error('SEED-' + attempt + ': Error:', e.message);
      if (attempt < 30) {
        setTimeout(() => populate(attempt + 1), 10000);
      } else {
        process.exit(1);
      }
    });
  });
}

populate();
