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

async function salvarProdutosLocal(produtos) {
  console.log(`[IDB] 📥 Recebidos ${produtos.length} produtos para salvar localmente.`);
  const db = await abrirBanco();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('produtos', 'readwrite');
    const store = tx.objectStore('produtos');
    
    // Limpa a base antiga antes de popular a nova
    const clearReq = store.clear();
    
    clearReq.onsuccess = () => {
      console.log("[IDB] 🗑️ Tabela 'produtos' limpa com sucesso. Inserindo novos registros...");
      
      produtos.forEach((prod, index) => {
        const codLimpo = String(prod.codigo || prod.Codigo || prod.id || '').trim();
        if (codLimpo) {
          store.put({
            ...prod,
            codigo: codLimpo,
            nome: String(prod.nome || prod.Nome || '').trim(),
            preco: Number(prod.preco || prod.Preco || 0)
          });
        }
      });
    };

    tx.oncomplete = () => {
      console.log("[IDB] ✅ Transação de salvamento de produtos concluída e commitada com sucesso!");
      resolve(true);
    };

    tx.onerror = (err) => {
      console.error("[IDB] ❌ Erro na transação ao salvar produtos:", err);
      reject(err);
    };
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

    let termoLimpo = String(termo).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let qtd = 1;

    if (termoLimpo.includes('*')) {
      const partes = termoLimpo.split('*');
      const q = parseFloat(partes[0].replace(',', '.'));
      if (!isNaN(q) && q > 0) {
        qtd = q;
        termoLimpo = partes.slice(1).join('*').trim();
      }
    }

    const requestCursor = store.openCursor();
    let encontrado = null;
    let contadorRegistros = 0;

    requestCursor.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        contadorRegistros++;
        const produto = cursor.value;
        
        // Log para inspecionar o primeiro produto e entender as propriedades reais do objeto
        if (contadorRegistros === 1) {
          console.log("[DEBUG IDB] Exemplo de estrutura do produto no banco:", produto);
        }

        // Verifica múltiplas variações possíveis para a chave do código e do nome
        const codProd = String(produto.codigo || produto.Codigo || produto.id || produto.ID || '').trim().toLowerCase();
        const nomeProd = String(produto.nome || produto.Nome || '').trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (codProd === termoLimpo || codProd.includes(termoLimpo)) {
          encontrado = produto;
          console.timeEnd("⏱️ Tempo Total Busca Local");
          console.log(`[BUSCA PDV] ✅ Encontrado por código/ID na varredura:`, produto);
          resolve({ ...encontrado, qtdAdicionada: qtd });
          return;
        }

        if (!encontrado && nomeProd.includes(termoLimpo)) {
          encontrado = produto;
          console.timeEnd("⏱️ Tempo Total Busca Local");
          console.log(`[BUSCA PDV] ✅ Encontrado por nome na varredura:`, produto);
          resolve({ ...encontrado, qtdAdicionada: qtd });
          return;
        }

        cursor.continue();
      } else {
        console.timeEnd("⏱️ Tempo Total Busca Local");
        console.warn(`[BUSCA PDV] ⚠️ Fim da varredura. Total de registros analisados na tabela: ${contadorRegistros}`);
        resolve(null);
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
