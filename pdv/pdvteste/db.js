// db.js - Gerenciador do Banco de Dados Local (IndexedDB)
const DB_NAME = 'PDV_Offline_DB';
const DB_VERSION = 1;

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Tabela de Produtos (busca por código ou nome)
      if (!db.objectStoreNames.contains('produtos')) {
        const prodStore = db.createObjectStore('produtos', { keyPath: 'codigo' });
        prodStore.createIndex('nome', 'nome', { unique: false });
      }

      // Tabela de Usuários (para login offline)
      if (!db.objectStoreNames.contains('usuarios')) {
        db.createObjectStore('usuarios', { keyPath: 'user' });
      }

      // Tabela de Configurações da Loja
      if (!db.objectStoreNames.contains('configuracoes')) {
        db.createObjectStore('configuracoes', { keyPath: 'chave' });
      }

      // Fila de Vendas Pendentes de Sincronização
      if (!db.objectStoreNames.contains('vendas_pendentes')) {
        db.createObjectStore('vendas_pendentes', { autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Salva a lista inteira de produtos recebida do Google
async function salvarProdutosLocal(produtos) {
  const db = await abrirBanco();
  const tx = db.transaction('produtos', 'readwrite');
  const store = tx.objectStore('produtos');
  await store.clear(); // Limpa o catálogo antigo
  produtos.forEach(p => store.put(p));
  return tx.complete;
}

// Busca um produto localmente por código ou parte do nome
async function buscarProdutoLocal(termo) {
  const db = await abrirBanco();
  const tx = db.transaction('produtos', 'readonly');
  const store = tx.objectStore('produtos');

  return new Promise((resolve) => {
    // Tenta buscar por Código exato primeiro
    const reqCodigo = store.get(termo);
    reqCodigo.onsuccess = () => {
      if (reqCodigo.result) {
        resolve(reqCodigo.result);
      } else {
        // Se não achou por código, faz busca por texto no nome
        const reqAll = store.getAll();
        reqAll.onsuccess = () => {
          const termoLower = termo.toLowerCase();
          const achado = reqAll.result.find(p => p.nome.toLowerCase().includes(termoLower));
          resolve(achado || null);
        };
      }
    };
  });
}

// Guarda a venda na fila pendente quando estiver offline
async function salvarVendaPendente(dadosVenda) {
  const db = await abrirBanco();
  const tx = db.transaction('vendas_pendentes', 'readwrite');
  const store = tx.objectStore('vendas_pendentes');
  store.add({ ...dadosVenda, dataCriacao: new Date().toISOString() });
  return tx.complete;
}

// Retorna todas as vendas pendentes de sincronização
async function obterVendasPendentes() {
  const db = await abrirBanco();
  const tx = db.transaction('vendas_pendentes', 'readonly');
  const store = tx.objectStore('vendas_pendentes');
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

// Limpa as vendas pendentes após o envio com sucesso ao Google
async function limparVendasPendentes() {
  const db = await abrirBanco();
  const tx = db.transaction('vendas_pendentes', 'readwrite');
  const store = tx.objectStore('vendas_pendentes');
  await store.clear();
  return tx.complete;
}
