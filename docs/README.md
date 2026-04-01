# F1 Telemetry Server

## Porte
- `20001` → Pilota 1
- `20002` → Pilota 2
- `8000`  → API REST

## Setup VM
```bash
git clone https://github.com/TUO_USERNAME/f1-telemetry.git
cd f1-telemetry
cp .env.example .env
nano .env
docker-compose up -d
```

## Aggiornare
```bash
bash scripts/deploy.sh
```