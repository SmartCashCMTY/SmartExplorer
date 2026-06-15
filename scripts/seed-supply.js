const { exec } = require('child_process');
const mongo = require('mongodb').MongoClient;

exec('/usr/local/bin/smartcash-cli -conf=/etc/smartcash3/smartcash.conf -datadir=/var/lib/smartcash3 gettxoutsetinfo', { timeout: 30000 }, (err, stdout) => {
  let supply = 3167797400;
  try { supply = JSON.parse(stdout).total_amount; } catch (e) {}
  mongo.connect('mongodb://127.0.0.1:27017/smartcash3', (err, client) => {
    client.db().collection('coinstats').updateOne({}, { $set: { supply: supply } }, { upsert: true }, () => {
      console.log('Supply seeded: ' + supply);
      client.close();
      process.exit(0);
    });
  });
});
