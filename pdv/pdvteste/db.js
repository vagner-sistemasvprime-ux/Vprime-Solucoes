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

// Salva a lista de produtos no IndexedDB
async function salvarProdutosLocal(produtos) {
  const db = await abrirBanco();
  const tx = db.transaction('produtos', 'readwrite');
  const store = tx.objectStore('produtos');
  await store.clear(); // Limpa a lista antiga
  produtos.forEach(prod => store.put(prod));
  return tx.complete;
}

// Salva a lista de clientes no IndexedDB
async function salvarClientesLocal(clientes) {
  const db = await abrirBanco();
  const tx = db.transaction('clientes', 'readwrite');
  const store = tx.objectStore('clientes');
  await store.clear();
  clientes.forEach(cli => store.put(cli));
  return tx.complete;
}

// Busca produto no IndexedDB por Código ou Nome
async function buscarProdutoLocal(termo) {
  const db = await abrirBanco();
  const tx = db.transaction('produtos', 'readonly');
  const store = tx.objectStore('produtos');

  return new Promise((resolve) => {
    let termoLimpo = String(termo).trim().toLowerCase();
    let qtd = 1;

    // Trata o multiplicador (Ex: 3*1001)
    if (termoLimpo.includes('*')) {
      const partes = termoLimpo.split('*');
      const q = parseFloat(partes[0].replace(',', '.'));
      if (!isNaN(q) && q > 0) {
        qtd = q;
        termoLimpo = partes.slice(1).join('*').trim();
      }
    }

    const req = store.getAll();
    req.onsuccess = () => {
      const produtos = req.result || [];
      const achado = produtos.find(p => 
        String(p.codigo).toLowerCase() === termoLimpo || 
        String(p.nome).toLowerCase().includes(termoLimpo)
      );

      if (achado) {
        resolve({ ...achado, qtdAdicionada: qtd });
      } else {
        resolve(null);
      }
    };
  });
}

// Busca cliente no IndexedDB por Documento ou Nome
async function buscarClienteLocal(termo) {
  const db = await abrirBanco();
  const tx = db.transaction('clientes', 'readonly');
  const store = tx.objectStore('clientes');

  return new Promise((resolve) => {
    const termoLimpo = String(termo).trim().toLowerCase();
    const req = store.getAll();
    req.onsuccess = () => {
      const clientes = req.result || [];
      const achado = clientes.find(c => 
        String(c.documento).toLowerCase() === termoLimpo || 
        String(c.nome).toLowerCase().includes(termoLimpo)
      );
      resolve(achado || null);
    };
  });
}
