// Configuração do endpoint do Google Apps Script
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycby6VCGYZAVTbuYEFHA26_Mnye1hp-_aRQb_64W1uQRBfhE94ReO9t9D-Qyux440wGgdYw/exec";

/**
 * Envia os dados do formulário de contato via API (fetch)
 */
async function enviarMensagem(e) {
  e.preventDefault();

  const btn = document.getElementById('btnEnviar');
  const status = document.getElementById('statusEnvio');

  btn.disabled = true;
  btn.innerText = "Enviando...";

  const dados = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    whatsapp: document.getElementById('whatsapp').value,
    empresa: document.getElementById('empresa').value,
    mensagem: document.getElementById('mensagem').value
  };

  try {
    // Requisição HTTP POST para o Google Apps Script
    const resposta = await fetch(URL_WEB_APP, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Evita pré-flight de CORS no Apps Script
      },
      body: JSON.stringify(dados)
    });

    const res = await resposta.json();

    btn.disabled = false;
    btn.innerText = "Solicitar Teste Gratuito de 15 Dias";

    if (res && res.sucesso) {
      status.classList.remove('hidden', 'text-red-400');
      status.classList.add('text-emerald-400');
      status.innerText = "✅ Solicitação enviada com sucesso! Entraremos em contato para liberar seus 15 dias de teste.";
      document.getElementById('formContato').reset();
    } else {
      throw new Error(res ? res.erro : 'Erro ao processar');
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerText = "Solicitar Teste Gratuito de 15 Dias";

    status.classList.remove('hidden', 'text-emerald-400');
    status.classList.add('text-red-400');
    status.innerText = "❌ Falha na comunicação com o servidor.";
  }
}

/**
 * Abre o modal de imagem com zoom
 */
function abrirModal(urlImagem, titulo) {
  const modal = document.getElementById('modalZoom');
  const img = document.getElementById('modalImg');
  const txtTitulo = document.getElementById('modalTitulo');

  img.src = urlImagem;
  txtTitulo.innerText = titulo;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Fecha o modal de imagem
 */
function fecharModal() {
  const modal = document.getElementById('modalZoom');
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Evento para fechar o modal pressionando a tecla ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    fecharModal();
  }
});


window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
