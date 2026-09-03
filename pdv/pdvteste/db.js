// db.js - Gerenciador do Banco de Dados Local (IndexedDB)
const DB_NAME = 'PDV_Offline_DB';
const DB_VERSION = 2; // Incrementado para recriar as estruturas necessárias (clientes)

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Tabela de Produtos (chave primária: codigo)
      if (!db.objectStoreNames.contains('produtos')) {
        const prodStore = db.createObjectStore('produtos', { keyPath: 'codigo' });
        prodStore.createIndex('nome', 'nome', { unique: false });
      }

      // Tabela de Clientes (chave primária: documento ou id)
      if (!db.objectStoreNames.contains('clientes')) {
        const cliStore = db.createObjectStore('clientes', { keyPath: 'documento' });
        cliStore.createIndex('nome', 'nome', { unique: false });
      }

      // Tabela de Usuários (login offline)
      if (!db.objectStoreNames.contains('usuarios')) {
        db.createObjectStore('usuarios', { keyPath: 'user' });
      }

      // Tabela de Configurações da Loja
      if (!db.objectStoreNames.contains('configuracoes')) {
        db.createObjectStore('configuracoes', { keyPath: 'chave' });
      }

      // Fila de Vendas Pendentes
      if (!db.objectStoreNames.contains('vendas_pendentes')) {
        db.createObjectStore('vendas_pendentes', { autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Salva a lista inteira de produtos
async function salvarProdutosLocal(produtos) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('produtos', 'readwrite');
    const store = tx.objectStore('produtos');
    
    store.clear();

    produtos.forEach(prod => {
      const codigoOriginal = prod.codigo || prod.Codigo || prod.id || '';
      const codLimpo = String(codigoOriginal).trim(); // Força para String

      if (codLimpo) {
        store.put({
          ...prod,
          codigo: codLimpo, // Salva estritamente como String
          nome: String(prod.nome || prod.Nome || '').trim(),
          preco: Number(prod.preco || prod.Preco || 0)
        });
      }
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Salva a lista de clientes
async function salvarClientesLocal(clientes) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clientes', 'readwrite');
    const store = tx.objectStore('clientes');

    store.clear();

    clientes.forEach(cli => {
      const docLimpo = String(cli.documento || cli.Documento || cli.cpf || cli.id || '').trim();
      if (docLimpo) {
        store.put({
          ...cli,
          documento: docLimpo,
          nome: String(cli.nome || cli.Nome || '').trim()
        });
      }
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Busca otimizada usando Índices do IndexedDB (Ultra-rápida e sem carregar a tabela inteira)
async function buscarProdutoLocal(termo) {
  console.time("⏱️ Tempo Total Busca Local");
  const db = await abrirBanco();
  
  return new Promise((resolve) => {
    const tx = db.transaction('produtos', 'readonly');
    const store = tx.objectStore('produtos');

    let termoLimpo = String(termo).trim().toLowerCase();
    let qtd = 1;

    // Trata multiplicador no caixa (Ex: 3*1001)
    if (termoLimpo.includes('*')) {
      const partes = termoLimpo.split('*');
      const q = parseFloat(partes[0].replace(',', '.'));
      if (!isNaN(q) && q > 0) {
        qtd = q;
        termoLimpo = partes.slice(1).join('*').trim();
      }
    }

    // Usa um cursor para verificar tanto a igualdade exata do código (convertido para string) quanto a busca por nome
    const requestCursor = store.openCursor();
    let encontrado = null;

    requestCursor.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const produto = cursor.value;
        const codigoProd = String(produto.codigo || '').trim().toLowerCase();
        const nomeProd = String(produto.nome || '').trim().toLowerCase();

        // 1. Prioridade máxima: Código exato
        if (codigoProd === termoLimpo) {
          encontrado = produto;
          console.timeEnd("⏱️ Tempo Total Busca Local");
          resolve({ ...encontrado, qtdAdicionada: qtd });
          return;
        }

        // 2. Segunda prioridade: Nome contém o termo digitado
        if (!encontrado && nomeProd.includes(termoLimpo)) {
          encontrado = produto;
        }

        cursor.continue();
      } else {
        console.timeEnd("⏱️ Tempo Total Busca Local");
        if (encontrado) {
          resolve({ ...encontrado, qtdAdicionada: qtd });
        } else {
          resolve(null);
        }
      }
    };

    requestCursor.onerror = () => {
      console.timeEnd("⏱️ Tempo Total Busca Local");
      resolve(null);
    };
  });
}

// Busca cliente por Documento ou Nome
async function buscarClienteLocal(termo) {
  const db = await abrirBanco();
  return new Promise((resolve) => {
    const tx = db.transaction('clientes', 'readonly');
    const store = tx.objectStore('clientes');

    const termoLimpo = String(termo).trim().toLowerCase();

    // Tenta por documento exato primeiro
    const reqDoc = store.get(termoLimpo);
    reqDoc.onsuccess = () => {
      if (reqDoc.result) {
        resolve(reqDoc.result);
      } else {
        const reqAll = store.getAll();
        reqAll.onsuccess = () => {
          const clientes = reqAll.result || [];
          const achado = clientes.find(c => 
            String(c.documento).toLowerCase() === termoLimpo || 
            String(c.nome).toLowerCase().includes(termoLimpo)
          );
          resolve(achado || null);
        };
        reqAll.onerror = () => resolve(null);
      }
    };
    reqDoc.onerror = () => resolve(null);
  });
}

// Guarda a venda na fila pendente quando estiver offline
async function salvarVendaPendente(dadosVenda) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vendas_pendentes', 'readwrite');
    const store = tx.objectStore('vendas_pendentes');
    store.add({ ...dadosVenda, dataCriacao: new Date().toISOString() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Retorna todas as vendas pendentes de sincronização
async function obterVendasPendentes() {
  const db = await abrirBanco();
  return new Promise((resolve) => {
    const tx = db.transaction('vendas_pendentes', 'readonly');
    const store = tx.objectStore('vendas_pendentes');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

// Limpa as vendas pendentes após o envio com sucesso ao Google
async function limparVendasPendentes() {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vendas_pendentes', 'readwrite');
    const store = tx.objectStore('vendas_pendentes');
    store.clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
