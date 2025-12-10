# 📱 INSTALAÇÃO NO CELULAR/TABLET ANDROID

## 🎯 Cenário: Celular = Totem + Servidor de Impressão

### ✅ O que você precisa:
- Celular/Tablet Android
- Impressora térmica na mesma rede WiFi
- 10 minutos

---

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ **Instalar Termux no celular**

**Opção A (recomendado):**
- Baixe Termux da F-Droid: https://f-droid.org/en/packages/com.termux/

**Opção B:**
- Google Play Store (versão antiga, mas funciona)

---

### 2️⃣ **Configurar Termux**

Abra o Termux e execute:

```bash
# Atualiza pacotes
pkg update -y

# Instala Node.js
pkg install nodejs-lts -y

# Verifica instalação
node --version
npm --version
```

---

### 3️⃣ **Transferir arquivos para o celular**

**Método 1 - Via Google Drive/Dropbox:**
1. Compacte a pasta `print-server` em um ZIP
2. Faça upload para nuvem
3. Baixe no celular
4. Extraia na pasta Downloads

**Método 2 - Via cabo USB:**
1. Conecte celular no PC
2. Copie pasta `print-server` para `Downloads` do celular

**Método 3 - Via servidor local:**
```bash
# No PC (dentro da pasta flow-queue)
npx http-server -p 8000

# No Termux do celular
cd ~
curl -O http://IP_DO_PC:8000/print-server.zip
unzip print-server.zip
```

---

### 4️⃣ **Copiar arquivos para Termux**

```bash
# No Termux
cd ~
cp -r /storage/emulated/0/Download/print-server ~/print-server
cd ~/print-server
```

---

### 5️⃣ **Configurar variáveis de ambiente**

Edite o arquivo `.env`:

```bash
# No Termux
nano .env
```

Cole isso (suas credenciais já estão aqui):
```
SUPABASE_URL=https://aqrdfkszmnfqyqqjwdda.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcmRma3N6bW5mcXlxcWp3ZGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTEyNDYsImV4cCI6MjA3ODgyNzI0Nn0.TfLPho0e4fRGsRJL89Wvp3VIJBmqYbUg5zxZYxiQ7L4
```

Salve: `Ctrl+X` → `Y` → `Enter`

---

### 6️⃣ **Instalar dependências**

```bash
npm install
```

---

### 7️⃣ **Descobrir IP do celular**

```bash
# No Termux
pkg install net-tools -y
ifconfig wlan0
```

Anote o IP (ex: `192.168.1.100`)

---

### 8️⃣ **Iniciar servidor**

```bash
node server.js
```

Você verá algo como:
```
========================================
Servidor de Impressão ESC/POS rodando!
Porta: 3030

📱 Configure no sistema:
   URL Servidor: http://192.168.1.100:3030

🔗 URLs de acesso:
   Local: http://localhost:3030/health
   Rede:  http://192.168.1.100:3030/health
========================================
```

**⚠️ IMPORTANTE:** Anote o IP que aparecer!

---

### 9️⃣ **Manter servidor rodando em background**

**Opção A - Screen (recomendado):**
```bash
pkg install screen -y
screen -S printer
node server.js

# Para sair sem fechar: Ctrl+A, depois D
# Para voltar: screen -r printer
```

**Opção B - Termux Boot:**
```bash
pkg install termux-services -y
mkdir -p ~/.termux/boot
echo "cd ~/print-server && node server.js" > ~/.termux/boot/start-printer.sh
chmod +x ~/.termux/boot/start-printer.sh
```

---

### 🔟 **Configurar no sistema web**

1. Abra o sistema pelo Vercel (pode ser no mesmo celular ou PC)
2. Faça login como Admin
3. Vá em **Configurações** → **Impressão**
4. Configure:
   - **URL Servidor**: `http://192.168.1.100:3030` (o IP do seu celular)
   - **IP Impressora**: `192.168.1.50` (IP da impressora térmica)
   - **Porta**: `9100`
5. Clique em **Salvar**
6. Clique em **Testar Impressora**

---

## ✅ **Teste completo**

1. No celular, abra o navegador
2. Acesse o sistema pelo Vercel
3. Vá na tela do Totem (`/kiosk`)
4. Gere uma senha
5. A impressora deve imprimir! 🎉

---

## 🔧 **Solução de Problemas**

### ❌ "Connection refused"
- Verifique se o servidor está rodando: `http://IP_CELULAR:3030/health`
- Verifique firewall do Android (geralmente não tem)

### ❌ "Cannot reach printer"
- Verifique IP da impressora (ping no PC)
- Teste conexão: `telnet IP_IMPRESSORA 9100` (no PC)
- Verifique se impressora está ligada

### ❌ Termux fecha sozinho
- Desative otimização de bateria para Termux
- Use `screen` para manter em background
- Configure Termux:Boot

---

## 📝 **Comandos úteis**

```bash
# Ver IP do celular
ifconfig wlan0 | grep inet

# Testar servidor
curl http://localhost:3030/health

# Ver processos Node
ps aux | grep node

# Parar servidor
pkill node

# Reiniciar servidor
cd ~/print-server && node server.js
```

---

## 🎯 **Resumo do fluxo:**

```
[Celular/Tablet]
  ├── Navegador → Tela Totem (Vercel)
  └── Termux → Servidor Node.js
                  ↓
            [Impressora WiFi]
                  ↓
            Imprime senha! ✅
```

**Pronto!** Seu celular agora é o totem E o servidor de impressão! 🚀
