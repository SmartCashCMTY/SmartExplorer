# SmartExplorer 3.0.0

Copy/paste installer and complete guide for running the SmartCash 3.0.0 SmartExplorer on Ubuntu Server 24.04 LTS.

The Explorer keeps the original Iquidus footer. No custom sponsor footer is applied by this installer.

## Quick Install

```bash
wget https://raw.githubusercontent.com/SmartCashCMTY/SmartExplorerInstall/main/smart-iquidus-install.sh
sudo bash ./smart-iquidus-install.sh
```

After installation, start the initial database import:

```bash
cd /opt/smartcash3/explorer
sudo -u iquidus node scripts/sync.js index update
sudo -u iquidus node scripts/peers.js
```

Open:

```text
http://YOUR_SERVER_IP/explorer/
```

## Files

- `SMART_IQUIDUS_EXPLORER_COMPLETE_GUIDE.md`
- `smart-iquidus-install.sh`
- `iquidus-explorer.service`
- `nginx.conf`
- `README.md`

## Source Components

- Iquidus Explorer: `https://github.com/iquidus/explorer`
- SmartCash community files: `https://github.com/SmartCashCMTY/SmartExplorer`
