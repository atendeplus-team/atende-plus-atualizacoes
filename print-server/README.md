# Servidor de Impressão - Print Server

Servidor Node.js que conecta sistema web à impressora térmica via rede.

## 📱 Instalação no Celular/Tablet Android

Veja o guia completo: **[GUIA-INSTALACAO-ANDROID.md](GUIA-INSTALACAO-ANDROID.md)**

## 📋 Resumo Rápido

1. Instale Termux no Android
2. Instale Node.js: `pkg install nodejs-lts`
3. Copie esta pasta para o celular
4. Execute: `npm install && node server.js`
5. Configure IP do celular no Admin do sistema

## 📁 Arquivos

- `server.js` - Servidor HTTP que aceita comandos de impressão
- `.env` - Credenciais do Supabase (já configurado)
- `package.json` - Dependências Node.js

## 🔗 Links Úteis

- Termux F-Droid: https://f-droid.org/en/packages/com.termux/
- Node.js: https://nodejs.org/
