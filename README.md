# 🔥 Heatmap API

Backend REST para um app mobile de heatmap em React Native. Registra cliques na tela e agrupa por regiões para gerar o mapa de calor.

## Stack

- Node.js
- Express
- sql.js (SQLite)
- CORS
- UUID

## Como rodar

```bash
npm install
node index.js
```

A API sobe em `http://localhost:3000`

## Endpoints

### Sessions
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/sessions` | Lista todas as sessões |
| `GET` | `/sessions/:id` | Busca uma sessão |
| `POST` | `/sessions` | Cria uma nova sessão |
| `PUT` | `/sessions/:id` | Atualiza o nome da sessão |
| `PATCH` | `/sessions/:id` | Atualiza parcialmente a sessão |
| `DELETE` | `/sessions/:id` | Remove a sessão e seus clicks |

### Clicks
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/sessions/:id/clicks` | Lista os clicks da sessão |
| `GET` | `/sessions/:id/clicks/heatmap` | Retorna os clicks agrupados por região |
| `POST` | `/sessions/:id/clicks` | Registra um click |
| `POST` | `/sessions/:id/clicks/batch` | Registra vários clicks de uma vez |
| `PATCH` | `/sessions/:id/clicks/:clickId` | Atualiza a intensidade de um click |
| `DELETE` | `/sessions/:id/clicks` | Remove todos os clicks da sessão |
| `DELETE` | `/sessions/:id/clicks/:clickId` | Remove um click específico |

## Fluxo do app

```
Usuário abre o app      → POST /sessions
Usuário clica na tela   → POST /sessions/:id/clicks
Botão "Ver Heatmap"     → GET  /sessions/:id/clicks/heatmap
Botão "Resetar"         → DELETE /sessions/:id/clicks
```


## Devs: Augusto e Ryan
