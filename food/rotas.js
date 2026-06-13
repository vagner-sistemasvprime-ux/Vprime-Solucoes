// =========================================================================
// 📡 BANCO DE DADOS DE ROTAS DOS LOJISTAS (ARQUIVO ISOLADO)
// =========================================================================
const ROTAS_LOJISTAS = {

  //===========================
  //         TESTE
  //===========================

  
  "piloto": {
    // 🏢 DADOS DE IDENTIFICAÇÃO E CONEXÃO
    nome: "Sistema Piloto VPrime",
    urlGoogleAPI: "https://script.google.com/macros/s/AKfycbwqeYadUR.../exec",
    linkCardapio: "https://vprimesistemas.com.br/food/?loja=piloto",
    urlLogo: "https://lh3.googleusercontent.com/d/1l8pCAVl1Om3oIJ60pn1r4r9GSuBeZkhQ",
    idPlanilha: "1UawKIZ86m-MP9LhvfTS9pmtv2MERQ-LEk8MXc1TATIQ",
    
    plano: "PADRAO",               // Opções: "PRIME" ou "PADRAO"
    
    tipoPix: "automatico",        // Opções: "automatico" ou "manual"
    
    gerenciamentoMesa: "ATIVADO", // Opções: "ATIVADO" ou "DESATIVADO"
    
    intervaloVigilancia: 5000,    // Tempo em milissegundos para checar novos pedidos (ex: 5000 = 5s)
    tempoMaxCancelamento: 30,     // Tempo em minutos que o cliente tem para cancelar um pedido
    
    larguraImpressao: "58"        // Opções: "58" ou "80" (tamanho da bobina em milímetros)
  },



  
  //===========================
  //         MODELO
  //===========================

  
  "loja2": {
   // 🏢 DADOS DE IDENTIFICAÇÃO E CONEXÃO
    nome: "Sistema Piloto VPrime",
    urlGoogleAPI: "https://script.google.com/macros/s/AKfycbyiD33PF8zAGzRl0qmH4lkur7uZD6wmg4IxVXpuzPRCrvEY2jb3WZRZnq-XiDWFLNI3/exec",
    linkCardapio: "https://vprimesistemas.com.br/food/sistemamodelo",
    urlLogo: "https://lh3.googleusercontent.com/d/1l8pCAVl1Om3oIJ60pn1r4r9GSuBeZkhQ",
    idPlanilha: "1sjKEirWF6wiCvtma2iVv30iNqzOZJaK3WIKSP-kMlQg",
    
    plano: "PRIME",               // Opções: "PRIME" ou "PADRAO"
    
    tipoPix: "manual",        // Opções: "automatico" ou "manual"
    
    gerenciamentoMesa: "DESATIVADO", // Opções: "ATIVADO" ou "DESATIVADO"
    
    intervaloVigilancia: 5000,    // Tempo em milissegundos para checar novos pedidos (ex: 5000 = 5s)
    tempoMaxCancelamento: 30,     // Tempo em minutos que o cliente tem para cancelar um pedido
    
    larguraImpressao: "58"        // Opções: "58" ou "80" (tamanho da bobina em milímetros)
  },


  // Quando entrar a loja 3, 4, 5... você só mexe AQUI neste arquivo!
};
