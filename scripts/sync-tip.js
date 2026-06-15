const mongoose = require('mongoose');
const Client = require('bitcoin-core');
const settings = require('../lib/settings');
const Tx = require('../models/tx');
const Address = require('../models/address');
const AddressTx = require('../models/addresstx');
const Richlist = require('../models/richlist');
const Stats = require('../models/stats');

const client = new Client(settings.wallet);
const auth = settings.dbsettings.user ? settings.dbsettings.user + ':' + settings.dbsettings.password + '@' : '';
const dbString = 'mongodb://' + auth + settings.dbsettings.address + ':' + settings.dbsettings.port + '/' + settings.dbsettings.database;
const lookback = parseInt(process.argv[2] || '250', 10);

function sat(value) {
  return Math.round(parseFloat(value) * 100000000);
}

function cmd(method, parameters) {
  return new Promise((resolve, reject) => {
    client.command([{method, parameters}], (err, response) => err ? reject(err) : resolve(response[0]));
  });
}

async function upsertAddress(id, inc) {
  if (!id || id === 'coinbase') return;
  await Address.updateOne({a_id: id}, {$inc: inc, $setOnInsert: {a_id: id, name: ''}}, {upsert: true});
}

async function indexTx(txid, hash, height, blockTime) {
  if (await Tx.findOne({txid})) return false;

  const tx = await cmd('getrawtransaction', [txid, 1]);
  const vin = [];
  const vout = [];
  let total = 0;

  for (const input of tx.vin || []) {
    if (input.coinbase) {
      vin.push({addresses: 'coinbase', amount: tx.vout.reduce((sum, out) => sum + sat(out.value), 0)});
    } else if (input.txid) {
      try {
        const prev = await cmd('getrawtransaction', [input.txid, 1]);
        const prevOut = prev.vout && prev.vout[input.vout];
        const addr = prevOut && prevOut.scriptPubKey && prevOut.scriptPubKey.addresses && prevOut.scriptPubKey.addresses[0];
        const amount = prevOut ? sat(prevOut.value) : 0;
        if (addr) {
          vin.push({addresses: addr, amount});
          await upsertAddress(addr, {sent: amount, balance: -amount});
          await AddressTx.updateOne({a_id: addr, txid}, {$inc: {amount: -amount}, $set: {blockindex: height}}, {upsert: true});
        }
      } catch (e) {}
    }
  }

  for (const out of tx.vout || []) {
    const addr = out.scriptPubKey && out.scriptPubKey.addresses && out.scriptPubKey.addresses[0];
    if (!addr) continue;
    const amount = sat(out.value);
    total += amount;
    const existing = vout.find(v => v.addresses === addr);
    if (existing) existing.amount += amount;
    else vout.push({addresses: addr, amount});
    await upsertAddress(addr, {received: amount, balance: amount});
    await AddressTx.updateOne({a_id: addr, txid}, {$inc: {amount}, $set: {blockindex: height}}, {upsert: true});
  }

  await Tx.updateOne({txid}, {$setOnInsert: {txid, vin, vout, total, timestamp: tx.time || blockTime, blockhash: hash, blockindex: height}}, {upsert: true});
  return true;
}

async function main() {
  await mongoose.connect(dbString);
  const count = await cmd('getblockcount', []);
  const start = Math.max(1, count - lookback);
  let inserted = 0;

  for (let height = start; height <= count; height++) {
    const hash = await cmd('getblockhash', [height]);
    const block = await cmd('getblock', [hash]);
    for (const txid of block.tx) {
      if (await indexTx(txid, hash, height, block.time)) inserted++;
    }
  }

  const balance = await Address.find({balance: {$gt: 0}}, 'a_id balance received name').sort({balance: -1}).limit(100).lean();
  const received = await Address.find({received: {$gt: 0}}, 'a_id balance received name').sort({received: -1}).limit(100).lean();
  await Richlist.updateOne({coin: settings.coin}, {$set: {balance, received}}, {upsert: true});
  await Stats.updateOne({coin: settings.coin}, {$set: {count}}, {upsert: true});

  const max = await Tx.findOne({}).sort({blockindex: -1}).lean();
  console.log(JSON.stringify({start, count, inserted, maxBlock: max && max.blockindex}));
  await mongoose.disconnect();
}

main().catch(async e => {
  console.error(e);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
