# 📱 Documentação Completa - Servidor de Impressão no Termux

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura da Solução](#arquitetura-da-solução)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Como Funciona](#como-funciona)
5. [Manutenção e Troubleshooting](#manutenção-e-troubleshooting)
6. [Configuração de Auto-Start](#configuração-de-auto-start)

---

## 🎯 Visão Geral

### O que foi implementado?
Um servidor Node.js rodando no **Termux (Android)** que atua como ponte entre o sistema web (hospedado no Vercel) e uma impressora térmica ESC/POS conectada na rede local.

### Por que usar o celular?
- **Custo zero**: Utiliza dispositivo que você já possui
- **Mobilidade**: Pode ser movido facilmente
- **Simplicidade**: Não requer servidor dedicado ou Raspberry Pi
- **Eficiência**: Baixo consumo de energia

### Componentes da solução
- **Frontend**: Sistema web hospedado no Vercel
- **Backend**: Supabase (banco de dados e autenticação)
- **Print Server**: Node.js rodando no Termux (Android)
- **Impressora**: Térmica ESC/POS conectada via WiFi

---

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUXO DE IMPRESSÃO                       │
└─────────────────────────────────────────────────────────────┘

[Sistema Web - Vercel]
         │
         │ (1) Usuário clica em "Imprimir"
         ↓
[Supabase - Banco de Dados]
         │
         │ (2) Busca configurações (IP impressora, porta, etc)
         ↓
[Print Server - Termux/Node.js]
         │
         │ (3) Recebe comando HTTP POST /print
         │     com dados ESC/POS
         ↓
[Impressora Térmica WiFi]
         │
         └─→ (4) Imprime senha/ticket ✅
```

### Detalhamento técnico

**1. Sistema Web (Frontend)**
- Tecnologia: React + TypeScript + Vite
- Hospedagem: Vercel
- Função: Interface do usuário (Totem, Operador, Admin)

**2. Supabase (Backend)**
- Banco de dados: PostgreSQL
- Tabela `company_settings`: Armazena configurações da impressora
  - `print_server_url`: URL do servidor Node.js (ex: http://192.168.1.100:3030)
  - `printer_ip`: IP da impressora térmica (ex: 192.168.2.226)
  - `printer_port`: Porta TCP da impressora (padrão: 9100)

**3. Print Server (Termux)**
- Tecnologia: Node.js + Express
- Local: Celular/Tablet Android com Termux
- Porta: 3030
- Função: Receber comandos HTTP e enviar para impressora via socket TCP

**4. Impressora Térmica**
- Protocolo: ESC/POS
- Conexão: WiFi (mesma rede do celular)
- Porta: 9100 (padrão para impressoras de rede)

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- ✅ Celular/Tablet Android
- ✅ Impressora térmica com suporte WiFi
- ✅ Roteador WiFi (mesma rede para ambos)
- ✅ 10-15 minutos

---

### PASSO 1: Instalar Termux

**Opção A - F-Droid (Recomendado)**
1. Acesse: https://f-droid.org/en/packages/com.termux/
2. Baixe e instale o Termux

**Opção B - Google Play Store**
- Versão antiga, mas funcional

---

### PASSO 2: Configurar Termux

Abra o Termux e execute os comandos:

```bash
# Atualizar repositórios
pkg update -y

# Instalar Node.js LTS
pkg install nodejs-lts -y

# Verificar instalação
node --version
npm --version
```

**Saída esperada:**
```
v22.21.1
10.9.4
```

---

### PASSO 3: Dar permissão de armazenamento

```bash
termux-setup-storage
```

Clique em **"Permitir"** quando o popup aparecer.

---

### PASSO 4: Criar estrutura do servidor

```bash
# Criar pasta do projeto
cd ~
mkdir print-server
cd print-server
```

---

### PASSO 5: Criar arquivo package.json

```bash
cat > package.json << 'EOF'
{
  "name": "print-server",
  "version": "1.0.0",
  "description": "Servidor de impressão ESC/POS",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
EOF
```

---

### PASSO 6: Criar arquivo .env

```bash
cat > .env << 'EOF'
SUPABASE_URL=https://aqrdfkszmnfqyqqjwdda.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcmRma3N6bW5mcXlxcWp3ZGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyNDYsImV4cCI6MjA3ODgyNzI0Nn0.TfLPho0e4fRGsRJL89Wvp3VIJBmqYbUg5zxZYxiQ7L4
EOF
```

---

### PASSO 7: Criar server.js

```bash
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const net = require('net');
require('dotenv').config();

const app = express();
const PORT = 3030;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

app.use(cors());
app.use(express.json());

async function getPrinterSettings() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/company_settings?select=printer_ip,printer_port&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar configurações: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Nenhuma configuração encontrada');
    }

    return {
      printer_ip: data[0].printer_ip,
      printer_port: data[0].printer_port || 9100,
    };
  } catch (error) {
    console.error('Erro ao buscar configurações do Supabase:', error.message);
    return null;
  }
}

app.post('/print', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'data array is required' });
    }

    const settings = await getPrinterSettings();
    
    if (!settings || !settings.printer_ip) {
      return res.status(400).json({ 
        success: false, 
        error: 'Configurações da impressora não encontradas no Supabase' 
      });
    }

    const { printer_ip, printer_port } = settings;
    const bytes = Buffer.from(data);

    console.log(`[${new Date().toISOString()}] Configurações carregadas: ${printer_ip}:${printer_port}`);
    console.log(`[${new Date().toISOString()}] Conectando a ${printer_ip}:${printer_port}`);
    console.log(`[${new Date().toISOString()}] Enviando ${bytes.length} bytes`);

    const client = new net.Socket();
    
    await new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout ao conectar na impressora'));
      }, 5000);

      client.connect(printer_port, printer_ip, () => {
        clearTimeout(timeout);
        console.log(`[${new Date().toISOString()}] Conectado à impressora`);
        
        client.write(bytes, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`[${new Date().toISOString()}] Dados enviados com sucesso`);
            setTimeout(() => {
              client.end();
              resolve();
            }, 300);
          }
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      client.on('close', () => {
        console.log(`[${new Date().toISOString()}] Conexão fechada`);
      });
    });

    res.json({ success: true, message: 'Impressão enviada com sucesso' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\n========================================`);
  console.log(`Servidor de Impressão ESC/POS rodando!`);
  console.log(`Porta: ${PORT}`);
  console.log(`\n📱 Configure no sistema:`);
  console.log(`   URL Servidor: http://${localIP}:${PORT}`);
  console.log(`\n🔗 URLs de acesso:`);
  console.log(`   Local: http://localhost:${PORT}/health`);
  console.log(`   Rede:  http://${localIP}:${PORT}/health`);
  console.log(`========================================\n`);
});
EOF
```

---

### PASSO 8: Instalar dependências

```bash
npm install
```

**Saída esperada:**
```
added 65 packages in 8s
```

---

### PASSO 9: Descobrir IP do celular

```bash
pkg install net-tools -y
ifconfig wlan0 | grep inet
```

**Exemplo de saída:**
```
inet 192.168.2.194 netmask 0xffffff00 broadcast 192.168.2.255
```

**Anote o IP**: `192.168.2.194`

---

### PASSO 10: Iniciar o servidor

```bash
node server.js
```

**Saída esperada:**
```
========================================
Servidor de Impressão ESC/POS rodando!
Porta: 3030

📱 Configure no sistema:
   URL Servidor: http://192.168.2.194:3030

🔗 URLs de acesso:
   Local: http://localhost:3030/health
   Rede:  http://192.168.2.194:3030/health
========================================
```

✅ **Servidor rodando com sucesso!**

---

### PASSO 11: Configurar no Sistema Web

1. Acesse o sistema pelo navegador (Vercel)
2. Faça login como **Admin**
3. Vá em **Configurações** → **Impressão**
4. Preencha:
   - **URL Servidor**: `http://192.168.2.194:3030` (IP do celular)
   - **IP Impressora**: `192.168.2.226` (IP da sua impressora)
   - **Porta TCP**: `9100`
5. Clique em **Salvar Configurações**
6. Clique em **Testar Impressora**

✅ **Se tudo estiver correto, a impressora vai imprimir um teste!**

---

## 🔄 Como Funciona (Fluxo Detalhado)

### Cenário: Usuário gera uma senha no totem

**1. Usuário clica em "Retirar Senha"**
```
Frontend (React) → Chama função printTicket()
```

**2. Sistema busca configurações**
```javascript
// Busca no Supabase:
// - print_server_url: http://192.168.2.194:3030
// - printer_ip: 192.168.2.226
// - printer_port: 9100
```

**3. Sistema gera comandos ESC/POS**
```javascript
const escpos = [
  0x1B, 0x40,        // Inicializa impressora
  0x1B, 0x61, 0x01,  // Centraliza texto
  // ... comandos de formatação
  0x1D, 0x56, 0x41,  // Corta papel
];
```

**4. Envia para Print Server**
```javascript
fetch('http://192.168.2.194:3030/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: escpos })
})
```

**5. Print Server processa**
```javascript
// server.js recebe POST /print
// Busca IP da impressora no Supabase
// Abre socket TCP para impressora
const client = new net.Socket();
client.connect(9100, '192.168.2.226');
client.write(Buffer.from(escpos));
```

**6. Impressora recebe e imprime**
```
Socket TCP → Impressora ESC/POS → Imprime senha! 🎫
```

---

## 🛠️ Manutenção e Troubleshooting

### Verificar se servidor está rodando

```bash
curl http://localhost:3030/health
```

**Saída esperada:**
```json
{"status":"ok","timestamp":"2025-12-04T10:30:00.000Z"}
```

---

### Ver logs do servidor

Os logs aparecem automaticamente no Termux onde você rodou `node server.js`.

**Exemplo de log de sucesso:**
```
[2025-12-04T10:30:15.123Z] Configurações carregadas: 192.168.2.226:9100
[2025-12-04T10:30:15.234Z] Conectando a 192.168.2.226:9100
[2025-12-04T10:30:15.345Z] Enviando 256 bytes
[2025-12-04T10:30:15.456Z] Conectado à impressora
[2025-12-04T10:30:15.567Z] Dados enviados com sucesso
[2025-12-04T10:30:15.678Z] Conexão fechada
```

---

### Manter servidor rodando em background

Use **screen** para não perder o servidor ao minimizar Termux:

```bash
# Instalar screen
pkg install screen -y

# Criar sessão
screen -S printer

# Dentro da sessão, iniciar servidor
cd ~/print-server
node server.js

# Sair sem fechar: Ctrl+A, depois D
```

**Para voltar à sessão:**
```bash
screen -r printer
```

**Para listar sessões:**
```bash
screen -ls
```

**Para matar uma sessão:**
```bash
screen -X -S printer quit
```

---

### Reiniciar servidor

```bash
# Parar servidor (se estiver rodando fora do screen)
pkill node

# Ou dentro do screen: Ctrl+C

# Iniciar novamente
cd ~/print-server
node server.js
```

---

### Erros comuns

#### ❌ "Connection refused"
**Causa**: Servidor não está rodando ou IP incorreto

**Solução:**
```bash
# Verificar se servidor está rodando
ps aux | grep node

# Ver IP do celular
ifconfig wlan0 | grep inet

# Testar conexão local
curl http://localhost:3030/health
```

---

#### ❌ "Cannot reach printer"
**Causa**: Impressora desligada, IP errado ou rede diferente

**Solução:**
```bash
# No PC, testar conexão com impressora
ping 192.168.2.226

# Testar porta (Windows)
Test-NetConnection -ComputerName 192.168.2.226 -Port 9100

# Verificar se celular e impressora estão na mesma rede WiFi
```

---

#### ❌ "Module not found"
**Causa**: Dependências não instaladas

**Solução:**
```bash
cd ~/print-server
rm -rf node_modules package-lock.json
npm install
```

---

#### ❌ Termux fecha sozinho
**Causa**: Android matando processo por otimização de bateria

**Solução:**
1. Desative otimização de bateria para Termux (ver seção Auto-Start)
2. Use `screen` para manter em background
3. Mantenha celular carregando

---

## 🚀 Configuração de Auto-Start

Para o servidor iniciar automaticamente quando o celular ligar:

### PASSO 1: Instalar Termux:Boot

1. Acesse F-Droid: https://f-droid.org/en/packages/com.termux.boot/
2. Baixe e instale **Termux:Boot**

---

### PASSO 2: Configurar script de inicialização

```bash
# Instalar dependências
pkg install termux-services -y

# Criar pasta de boot
mkdir -p ~/.termux/boot

# Criar script
cat > ~/.termux/boot/start-printer.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/print-server
node server.js > ~/printer.log 2>&1
EOF

# Dar permissão de execução
chmod +x ~/.termux/boot/start-printer.sh
```

---

### PASSO 3: Configurar Android

#### A. Desativar otimização de bateria

1. Abra **Configurações** do Android
2. Vá em **Bateria** → **Otimização de bateria**
3. Encontre **Termux** → Selecione **Não otimizar**
4. Encontre **Termux:Boot** → Selecione **Não otimizar**

#### B. Permitir execução em segundo plano

1. **Configurações** → **Aplicativos**
2. Selecione **Termux**
3. **Bateria** → **Sem restrições**
4. Repita para **Termux:Boot**

#### C. Ativar Autostart (varia por fabricante)

**Xiaomi:**
- Segurança → Autostart → Ativar Termux e Termux:Boot

**Samsung:**
- Configurações → Bateria → Uso de bateria sem restrições

**Outros:**
- Procure por "Autostart", "Apps de inicialização" ou similar

---

### PASSO 4: Testar

1. Reinicie o celular completamente
2. Aguarde 2-3 minutos
3. Teste acessar: `http://IP_DO_CELULAR:3030/health`

**Se não funcionar:**
```bash
# Ver log
cat ~/printer.log

# Verificar se script executou
ls -la ~/.termux/boot/

# Testar script manualmente
~/.termux/boot/start-printer.sh
```

---

## 📊 Monitoramento

### Ver status do servidor

```bash
# Ver processos Node.js
ps aux | grep node

# Ver uso de memória
top | grep node

# Ver log de impressões
tail -f ~/printer.log
```

---

### Estatísticas de rede

```bash
# Ver conexões ativas
netstat -tupln | grep 3030

# Ver interface de rede
ifconfig wlan0
```

---

## 🔒 Segurança

### Boas práticas

✅ **Usar rede WiFi privada** (não pública)
✅ **Não expor porta 3030 para internet** (somente rede local)
✅ **Manter Termux atualizado**: `pkg upgrade`
✅ **Backup do script**: Guardar `print-server` em nuvem

---

## 📝 Comandos Úteis - Referência Rápida

```bash
# Ver IP do celular
ifconfig wlan0 | grep inet

# Testar servidor local
curl http://localhost:3030/health

# Ver processos Node
ps aux | grep node

# Parar servidor
pkill node

# Reiniciar servidor
cd ~/print-server && node server.js

# Screen - criar sessão
screen -S printer

# Screen - voltar à sessão
screen -r printer

# Screen - listar sessões
screen -ls

# Screen - matar sessão
screen -X -S printer quit

# Ver log
tail -f ~/printer.log

# Limpar log
> ~/printer.log

# Backup
tar -czf ~/print-server-backup.tar.gz ~/print-server
```

---

## 🎯 Checklist de Funcionamento

### ✅ Antes de usar em produção

- [ ] Termux instalado e atualizado
- [ ] Node.js instalado (`node --version`)
- [ ] Servidor criado em `~/print-server`
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] IP do celular anotado
- [ ] Servidor rodando (`node server.js`)
- [ ] Health check respondendo (`curl http://localhost:3030/health`)
- [ ] Impressora ligada e na mesma rede WiFi
- [ ] IP da impressora descoberto e testado (`ping IP_IMPRESSORA`)
- [ ] Configurações salvas no Admin do sistema
- [ ] Teste de impressão realizado com sucesso
- [ ] Screen configurado para manter em background
- [ ] (Opcional) Termux:Boot configurado
- [ ] (Opcional) Otimização de bateria desativada

---

## 🆘 Suporte e Contatos

### Logs importantes para debug

Sempre forneça essas informações ao reportar problemas:

```bash
# Versão do Node
node --version

# IP do celular
ifconfig wlan0 | grep inet

# Status do servidor
curl http://localhost:3030/health

# Log recente
tail -20 ~/printer.log

# Processos rodando
ps aux | grep node
```

---

## 📚 Referências

- **Termux**: https://termux.dev/
- **Termux F-Droid**: https://f-droid.org/en/packages/com.termux/
- **Termux:Boot**: https://f-droid.org/en/packages/com.termux.boot/
- **Node.js**: https://nodejs.org/
- **Express.js**: https://expressjs.com/
- **ESC/POS**: https://en.wikipedia.org/wiki/ESC/P

---

## 🎉 Conclusão

Você agora tem um servidor de impressão profissional rodando no seu celular Android!

**Vantagens:**
- ✅ Custo zero
- ✅ Fácil configuração
- ✅ Portátil e flexível
- ✅ Baixo consumo de energia

**Para produção séria:**
- Use celular dedicado (deixe sempre carregando)
- Configure Termux:Boot para auto-start
- Monitore logs regularmente
- Considere upgrade para Raspberry Pi se precisar de 100% uptime

---

**Documentação criada em:** 04/12/2025
**Versão:** 1.0.0
**Status:** ✅ Testado e funcionando
