# Flow Queue

Sistema completo de gerenciamento de filas de atendimento com painéis, totem, relatórios analíticos e gestão de usuários.

## ✨ Principais Funcionalidades

### 🎯 Gestão de Filas

- **Totem de autoatendimento** para emissão de senhas
- **Painel de operador** com chamada e atendimento de senhas
- **Painel médico** com fila FIFO para consultórios
- **Display público** para exibição de chamadas em tempo real
- **Priorização** de atendimento (Normal/Preferencial)

### 📊 Relatórios e Analytics

- **Dashboard administrativo** com estatísticas em tempo real
- **Relatórios detalhados** com gráficos coloridos:
  - Desempenho por operador (com separação Normal/Preferencial)
  - Desempenho por médico (com especialidades)
  - Distribuição por fila (gráfico de pizza)
  - Senhas por horário (gráfico de linha)
  - Tempo médio de atendimento
- **Exportação** para Excel e PDF
- **Filtros de data** personalizáveis
- **Monitoramento em tempo real** com atualização a cada 10 segundos

### 👥 Gestão de Usuários

- **Interface organizada por perfis**:
  - Administradores (controle total)
  - Operadores (atendimento de guichê)
  - Médicos (atendimento médico com especialidades)
  - Totens (visualização apenas)
- **Gerenciamento de especialidades médicas**
- **Controle de acesso baseado em roles (RBAC)**

### 🖨️ Impressão

- **Integração com QZ Tray** para impressoras térmicas
- **Reimpressão de senhas** pelo operador
- **Corte automático** de papel
- **Layout otimizado** para impressão 80mm

### 🎨 Melhorias de Interface

- **Cards coloridos** por tipo de usuário
- **Gráficos vibrantes** com cores distintas
- **Tabelas responsivas** com hover effects
- **Badges de status** coloridos
- **Ordenação e filtros** em tempo real

## 🆕 Últimas Atualizações (Dezembro 2025)

### Relatórios e Analytics

- ✅ Adicionado desempenho por médico com especialidades
- ✅ Separação de atendimentos Normal/Preferencial em gráficos e tabelas
- ✅ Gráficos com cores vibrantes (agrupados, não empilhados)
- ✅ Correção na detecção de tickets preferenciais
- ✅ Exportação completa para Excel e PDF com todas as colunas

### Monitoramento em Tempo Real

- ✅ Nova seção "Desempenho em Tempo Real" no Admin
- ✅ Colunas: Código, Status, Emissão, Finalização, Atendimento, Cancelamento, Tempo de Espera
- ✅ Filtros por status (Todos, Aguardando, Chamado, Atendido, Cancelado)
- ✅ Ordenação por múltiplos campos (data, código, status, tempo)
- ✅ Atualização silenciosa em background (sem piscar tela)
- ✅ Campo `cancelled_at` adicionado ao banco de dados

### Gestão de Usuários

- ✅ Interface reorganizada com cards separados por perfil
- ✅ Cores e ícones distintos para cada tipo de usuário
- ✅ Melhor visualização e organização

### Otimizações

- ✅ Removidos console.logs desnecessários
- ✅ Melhorada performance de atualização automática
- ✅ Removido card "Por Fila" (mantido apenas "Por Prioridade")

## Requisitos

- Node.js 18+
- Vite
- Supabase (URL e Publishable Key)
- QZ Tray (opcional) para impressão fiscal/corte em impressoras térmicas

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=SEU_URL
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE
```

## Scripts

```bash
npm run dev       # Inicia o ambiente de desenvolvimento
npm run build     # Build de produção
npm run preview   # Pré-visualização do build
npm run lint      # Lint
```

## Perfis e Rotas

- `/kiosk` (Totem): permitido `visitor` e `admin`
- `/operator` (Guichê): permitido `operator` e `admin`
- `/doctor` (Consultório): permitido `doctor` e `admin`
- `/dashboard` (Painel geral): requer sessão
- `/admin` (Dashboard administrativo): apenas `admin`
  - Visão Geral: estatísticas, desempenho de operadores e médicos, tempo real
  - Relatórios: acesso à página de analytics completa
  - Gerenciamento: criação e edição de filas
  - Configurações: upload de logo, slides e configurações de impressora
- `/admin/reports` (Relatórios e Analytics): apenas `admin`
  - Gráficos detalhados por operador e médico
  - Filtros de data personalizáveis
  - Exportação Excel e PDF
- `/users` (Gerenciamento de Usuários): apenas `admin`
  - Cards separados por perfil (Admin, Operador, Médico, Toten)
  - Criação e edição de usuários
  - Gerenciamento de especialidades médicas
- `/display`, `/doctor-display`: painéis públicos de exibição
- `/ticket/:id`, `/track`: acompanhamento de senhas

## Sessões simultâneas

- O cliente Supabase usa `localStorage` por navegador/perfil. Em um mesmo perfil de navegador, apenas uma sessão fica ativa.
- Para acessos simultâneos sem derrubar sessões:
  - Use dispositivos diferentes (tablet para totem, PC do guichê, PC do consultório, etc.)
  - Ou use perfis/containers diferentes do navegador (Chrome Perfis, Edge Perfis, Firefox Containers) ou navegadores distintos.

## Impressão Fiscal (QZ Tray)

- Para envio de corte automático após impressão:
  - Instale e execute o QZ Tray.
  - Autorize o site quando solicitado.
  - Defina o nome da impressora:
    ```js
    // No console do navegador
    localStorage.setItem('printer.name', 'NOME_DA_IMPRESSORA');
    ```
- O botão "Reimprimir Senha" em `/operator` usa o mesmo modelo visual de impressão do totem (80mm) e, se QZ estiver ativo, envia comando de corte após imprimir.

## Problemas comuns

- Fica em carregamento na rota protegida:
  - Verifique `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Verifique se o usuário possui a role correta na tabela `user_roles` (ex.: `operator` para `/operator`).
  - Garanta que as políticas RLS de `user_roles` permitam `SELECT` para `auth.uid()`.

## Desenvolvimento

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Gráficos**: Recharts
- **Exportação**: XLSX (Excel) + jsPDF (PDF)
- **Impressão**: QZ Tray (opcional)

## 📁 Estrutura do Projeto

### Páginas Principais

- `Admin.tsx`: Dashboard administrativo com 4 abas
- `Reports.tsx`: Relatórios completos com gráficos e exportação
- `UserManagement.tsx`: Gerenciamento de usuários por perfil
- `Operator.tsx`: Interface de atendimento do guichê
- `DoctorOperator.tsx`: Interface de atendimento médico
- `Kiosk.tsx`: Totem de autoatendimento
- `Display.tsx` / `DoctorDisplay.tsx`: Painéis públicos

### Banco de Dados

Principais tabelas:

- `tickets`: Senhas do sistema geral
- `doctor_tickets`: Senhas encaminhadas para médicos
- `profiles`: Dados dos usuários
- `user_roles`: Perfis de acesso (RBAC)
- `medical_specialties`: Especialidades médicas
- `queues`: Filas de atendimento
- `company_settings`: Configurações da empresa

### Migrations Recentes

- `20251208000005_add_cancelled_at_to_tickets.sql`: Campo de data de cancelamento

## 🎨 Paleta de Cores

### Gráficos e Dados

- **Operadores Normal**: `#3b82f6` (azul)
- **Operadores Preferencial**: `#10b981` (verde)
- **Médicos Normal**: `#f59e0b` (laranja)
- **Médicos Preferencial**: `#8b5cf6` (roxo)
- **Cores gerais**: `#ef4444`, `#06b6d4`, `#ec4899`, `#14b8a6`

### Status de Senhas

- **Aguardando**: Amarelo (`bg-yellow-500/10`)
- **Chamado**: Azul (`bg-blue-500/10`)
- **Atendido**: Verde (`bg-green-500/10`)
- **Cancelado**: Vermelho (`bg-red-500/10`)

### Perfis de Usuário

- **Admin**: Vermelho (`bg-red-50`)
- **Operador**: Azul (`bg-blue-50`)
- **Médico**: Verde (`bg-green-50`)
- **Toten**: Cinza (`bg-gray-50`)
- **Sem Perfil**: Âmbar (`bg-amber-50`)

## Changelog Resumido

- **2025-12-08**:
  - ✅ Monitoramento em tempo real com 7 colunas detalhadas
  - ✅ Campo `cancelled_at` adicionado ao banco
  - ✅ Ordenação customizável por múltiplos campos
  - ✅ Interface de usuários reorganizada em cards por perfil
  - ✅ Otimizações de performance (atualização silenciosa)
  - ✅ Remoção de console.logs desnecessários
- **2025-12-07**:
  - ✅ Relatórios com desempenho por médico e especialidades
  - ✅ Separação Normal/Preferencial em gráficos e tabelas
  - ✅ Gráficos coloridos (agrupados, não empilhados)
  - ✅ Correção detecção de prioridade (`priority` e `preferential`)
  - ✅ Exportação completa para Excel e PDF
- **2025-12-01**:
  - Reimpressão de Senha no `Operator`
  - Alinhamento dos botões, hover no Finalizar
  - Correções no `ProtectedRoute`
  - Fila médica FIFO estrita por `created_at`
  - Uso de `doctor_id` para filtragem nas edge functions

## Ajuda de Acesso

- Perfis recomendados e dispositivos:
  - Totem (tablet): acessar `/kiosk` com usuário `visitor`.
  - Guichê (PC atendente): acessar `/operator` com usuário `operator`.
  - Consultório (PC médico): acessar `/doctor` com usuário `doctor` e opcional `/doctor-display`.
  - Administração (PC admin): acessar `/dashboard` e rotas `/admin/*` com usuário `admin`.
- Sessões simultâneas sem queda:
  - Use dispositivos diferentes OU perfis/containers diferentes de navegador (Chrome/Edge Perfis, Firefox Containers) para isolar `localStorage`.
  - Alternativamente, utilize navegadores distintos (Chrome, Edge, Firefox) em paralelo.

## Comportamento da Fila do Médico (FIFO)

- Diferença em relação ao guichê (`/operator`): o guichê pode usar regras do tipo N,N,P; já o consultório usa ordem estrita de chegada (`created_at ASC`).
- Encaminhamento: ao finalizar no guichê, uma linha é inserida em `doctor_tickets` com `status='waiting'`, `in_service=false`, `finished_at=null`, `called_at=null` e `doctor_id`.
- Visualização: `doctor-queue-preview` retorna apenas os tickets aguardando, ordenados por `created_at ASC`.
- Chamada: `doctor-call-next` pega o primeiro aguardando e atualiza `status='called'`, `called_at=now()`, `in_service=true` e `counter`.
- Display: `/doctor-display` escuta atualizações (`UPDATE`) com `status=called` para mostrar a última chamada e sintetizar voz.

### Políticas RLS necessárias (exemplo)

- Seleção pelo médico:
  - `SELECT` em `doctor_tickets` usando `doctor_id = auth.uid()`.
- Atualização pelo médico (chamada/repetição/finalização):
  - `UPDATE` em `doctor_tickets` com `USING (doctor_id = auth.uid()) CHECK (doctor_id = auth.uid())`.
- Inserção por `operator/admin` ao finalizar atendimento no guichê:
  - `INSERT` permitido para roles de atendente/admin conforme necessidade.
- Capturas de tela
  - Operator: senha atual com três ações lado a lado.
  - Kiosk: emissão de senha e confirmação impressa.
  - Doctor: fila de senhas encaminhadas para o consultório.
  - (Adicione aqui imagens em `public/` e referencie-as quando disponíveis.)

## 📊 Features Detalhadas

### Dashboard Administrativo (`/admin`)

**Aba Visão Geral:**

- Cards com estatísticas do dia: Total, Atendidos, Aguardando, Tempo de Espera
- Tempo médio de atendimento e horário de pico
- Estatísticas por prioridade (Normal/Preferencial)
- Tabelas de desempenho (Operadores e Médicos)
- **Monitoramento em Tempo Real**:
  - Visualização de todas as senhas do dia
  - 7 colunas: Código, Status, Emissão, Finalização, Atendimento, Cancelamento, Tempo de Espera
  - Filtros por status
  - Ordenação por qualquer campo
  - Atualização automática a cada 10 segundos

**Aba Relatórios:**

- Botão de acesso à página completa de relatórios

**Aba Gerenciamento:**

- Criação e edição de filas
- Ativação/desativação de atendimentos
- Configuração de prioridades

**Aba Configurações:**

- Upload de logo da empresa
- Upload de slides para displays
- Configuração de impressora fiscal

### Relatórios e Analytics (`/admin/reports`)

**Filtros:**

- Data inicial e final personalizáveis
- Botão "Carregar Relatórios"
- Exportação para Excel e PDF

**Gráficos Implementados:**

1. **Desempenho por Operador**:

   - Gráfico de barras agrupadas
   - Cores: Azul (Normal) e Verde (Preferencial)
   - Tabela com: Operador, Guichê, Total, Normais, Preferenciais, Tempo Médio

2. **Desempenho por Médico**:

   - Gráfico de barras agrupadas
   - Cores: Laranja (Normal) e Roxo (Preferencial)
   - Tabela com: Médico, Consultório, Especialidade, Total, Normais, Preferenciais, Tempo Médio

3. **Distribuição por Fila**:

   - Gráfico de pizza com 8 cores vibrantes
   - Mostra proporção de atendimentos por setor

4. **Senhas por Horário**:

   - Gráfico de linha verde
   - Visualiza picos de movimento ao longo do dia

5. **Tempo Médio de Atendimento**:
   - Gráfico de barras laranja
   - Compara performance entre operadores

### Gestão de Usuários (`/users`)

**Interface Organizada:**

- Card Administradores (vermelho): Usuários com controle total
- Card Operadores (azul): Atendentes de guichê
- Card Médicos (verde): Profissionais de saúde com especialidades
- Card Totens (cinza): Dispositivos apenas para visualização
- Card Sem Perfil (âmbar): Usuários aguardando atribuição de permissões

**Funcionalidades:**

- Criar novo usuário com perfil específico
- Editar informações e trocar perfil
- Excluir usuários
- Gerenciar especialidades médicas (para médicos)
- Definir guichê/consultório/localização

### Operador (`/operator`)

**Recursos:**

- Visualização da fila de espera
- Chamada de próxima senha (com regras Normal/Preferencial)
- Repetir chamada (voz e display)
- Reimprimir senha
- Finalizar atendimento
- Cancelar atendimento (registra `cancelled_at`)
- Encaminhar para médico específico

### Médico (`/doctor`)

**Recursos:**

- Visualização da fila FIFO (ordem de chegada)
- Chamada de próxima senha
- Repetir chamada
- Finalizar atendimento
- Display próprio para consultório

## 🔒 Segurança e Permissões

### Row Level Security (RLS)

Todas as tabelas principais possuem políticas RLS configuradas:

- `tickets`: Acesso público para leitura/escrita
- `doctor_tickets`: Filtrado por `doctor_id` para médicos
- `user_roles`: Usuários só veem suas próprias roles
- `profiles`: Controle de acesso baseado em `auth.uid()`
- `medical_specialties`: Leitura pública, escrita admin

### Roles (RBAC)

- **admin**: Acesso total ao sistema
- **operator**: Atendimento de guichê e relatórios próprios
- **doctor**: Atendimento médico e fila própria
- **visitor**: Apenas visualização (totem)

## 🖨️ Configuração de Impressora

### Setup QZ Tray

1. Baixe e instale [QZ Tray](https://qz.io/download/)
2. Execute o QZ Tray
3. No primeiro acesso, autorize o site
4. Configure no localStorage:

```javascript
localStorage.setItem('printer.name', 'NOME_DA_SUA_IMPRESSORA');
```

### Configuração via Interface

1. Acesse `/admin` → aba Configurações
2. Preencha:
   - URL do servidor de impressão (opcional)
   - IP da impressora (opcional)
   - Porta (padrão: 9100)
3. Salve as configurações

### Comandos de Corte

O sistema envia automaticamente comandos ESC/POS para corte de papel após cada impressão.

## 🚀 Deploy

### Variáveis de Ambiente (Produção)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

### Build

```bash
npm run build
```

### Vercel (Recomendado)

O arquivo `vercel.json` já está configurado para rewrites corretos.

## 🆘 Troubleshooting

### Senhas preferenciais não aparecem

- ✅ Verifique se o campo `priority` no banco está como `'priority'` ou `'preferential'`
- ✅ O sistema agora detecta ambos os valores

### Gráficos em preto e branco

- ✅ Atualizado para cores fixas em hex (não usa mais variáveis CSS)

### Tela recarregando sozinha

- ✅ Otimizado: atualização agora é silenciosa em background

### Campo `cancelled_at` não existe

- ✅ Execute a migration: `supabase/migrations/20251208000005_add_cancelled_at_to_tickets.sql`
- ✅ Ou execute `update_existing_cancelled_tickets.sql` no SQL Editor do Supabase

### Console.log em excesso

- ✅ Removidos logs desnecessários em `useUserRole.ts` e outros componentes

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique o console do navegador para erros
2. Confirme as variáveis de ambiente
3. Valide as políticas RLS no Supabase
4. Verifique se o usuário tem a role correta em `user_roles`

---

**Desenvolvido com ❤️ usando React, TypeScript, Supabase e shadcn/ui**
