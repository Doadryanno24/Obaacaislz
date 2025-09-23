import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  get
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// -------------------- CONFIGURAÇÕES -------------------- //
const NOME_EMPRESA = "Oba Açaí Slz";
const WHATSAPP_EMPRESA = "5598989185812"; // Substitua pelo seu número
const ENDERECO_EMPRESA = "Av. Principal, 123 - Centro";

// -------------------- FIREBASE -------------------- //
const firebaseConfig = {
  apiKey: "AIzaSyAainLslFveLtxVzBMhU3Og3-OrqQTW7Eg",
  authDomain: "unitv-box-367cc.firebaseapp.com",
  databaseURL: "https://unitv-box-367cc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "unitv-box-367cc",
  storageBucket: "unitv-box-367cc.appspot.com",
  messagingSenderId: "271556789962",
  appId: "1:271556789962:web:02b2a4e024cda215271633",
  measurementId: "G-6PBGQGH18Y"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// -------------------- REFERÊNCIAS -------------------- //
const produtosRef = ref(database, 'produtos');
const pedidosRef = ref(database, 'pedidos');
const configRef = ref(database, 'configuracoes/taxaEntrega');
const perfisRef = ref(database, 'perfis');

let carrinho = [];
let taxaEntrega = 5.0;
let numeroPedido = 1;

// --- Perfil do cliente ---
let perfilCliente = {
  nome: '',
  whatsapp: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  referencia: ''
};

// --- Variáveis globais para o modal do produto ---
let produtoAtualModal = null;
let complementosSelecionadosModal = {};
let complementosSalvosPorProduto = {};

// -------------------- FUNÇÕES GLOBAIS -------------------- //
window.adicionarCarrinho = adicionarCarrinho;
window.mostrarTela = mostrarTela;
window.removerItemCarrinho = removerItemCarrinho;
window.abrirCarrinho = abrirCarrinho;
window.fecharCarrinho = fecharCarrinho;
window.salvarPerfil = salvarPerfil;
window.buscarEnderecoPorCEP = buscarEnderecoPorCEP;
window.formatarTelefone = formatarTelefone;
window.formatarCEP = formatarCEP;
window.abrirModalProduto = abrirModalProduto;
window.fecharModalProduto = fecharModalProduto;
window.adicionarProdutoDoModalAoCarrinho = adicionarProdutoDoModalAoCarrinho;
window.copiarComanda = copiarComanda;
window.fecharModal = fecharModal;

// REGISTRA SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.error('Falha ao registrar SW:', err));
  });
}

// Inicialização
window.addEventListener("DOMContentLoaded", () => {
  carregarTaxa();
  carregarProdutos();
  atualizarStatusLoja();
  carregarPerfil();
  setInterval(atualizarStatusLoja, 60000);

  // ✅ NOVO: Chama a função para verificar o navegador
  verificarEAlertarNavegadorIncompativel();

  // Event listeners para perfil
  document.getElementById("btn-salvar-perfil").addEventListener("click", salvarPerfil);
  document.getElementById("btn-buscar-cep").addEventListener("click", () => {
    const cep = document.getElementById("perfil-cep").value.replace(/\D/g, '');
    if (cep.length === 8) {
      buscarEnderecoPorCEP(cep);
    } else {
      mostrarModal("CEP inválido", "Digite um CEP válido com 8 dígitos");
    }
  });

  // Event listener para abrir o carrinho
  document.getElementById("btn-ver-carrinho").addEventListener("click", abrirCarrinho);

  // Event listener para FECHAR o carrinho
  document.getElementById("btn-fechar-carrinho").addEventListener("click", fecharCarrinho);

  // Formatação automática
  document.getElementById("perfil-whatsapp").addEventListener("input", formatarTelefone);
  document.getElementById("perfil-cep").addEventListener("input", formatarCEP);

  // Event listeners para o modal do produto
  document.getElementById('btn-fechar-modal-produto').addEventListener('click', fecharModalProdutoComReset);
  document.getElementById('modal-overlay-produto').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay-produto')) {
      fecharModalProduto();
    }
  });
  document.getElementById('btn-adicionar-ao-carrinho-modal').addEventListener('click', adicionarProdutoDoModalAoCarrinho);

  // ✅ PROMPT PARA INSTALAR O APP (PWA)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostrarPromptInstalacao();
  });
});

// ✅ FUNÇÃO CORRIGIDA PARA ABRIR LINK NO NAVEGADOR EXTERNO
function abrirLinkExterno(url) {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);

  if (isAndroid) {
    // Para Android, usa o protocolo 'intent' com uma fallback URL.
    const intentUrl = `intent:${url}#Intent;scheme=https;package=com.android.chrome;end;`;
    window.location.href = intentUrl;
  } else if (isIOS) {
    // Para iOS, tenta abrir diretamente.
    window.open(url, '_blank');
  } else {
    // Para desktops e outros, abre uma nova aba normalmente.
    window.open(url, '_blank');
  }
}

// ✅ FUNÇÃO PARA VERIFICAR E AVISAR SOBRE NAVEGADORES EMBUTIDOS
function verificarEAlertarNavegadorIncompativel() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isInsideWhatsApp = /WhatsApp/.test(userAgent);
  const isInsideInstagram = /Instagram/.test(userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isInsideWebView = isInsideWhatsApp || isInsideInstagram;

  // Mostra o alerta apenas em navegadores embutidos no celular
  if (isMobile && isInsideWebView) {
    const container = document.createElement('div');
    container.id = 'webview-prompt';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: #ea1d2c;
      color: white;
      text-align: center;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    `;

    container.innerHTML = `
      <span>💡 Para melhor experiência, abra no seu navegador principal!</span>
      <button id="btn-abrir-navegador" style="
        padding: 6px 12px;
        background: white;
        color: #ea1d2c;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
      ">Abrir no Navegador</button>
    `;

    if (!document.getElementById('webview-prompt')) {
      document.body.appendChild(container);

      // ✅ ATUALIZADO: Chama a nova função ao clicar no botão
      document.getElementById('btn-abrir-navegador').addEventListener('click', () => {
        const urlAtual = window.location.href;
        abrirLinkExterno(urlAtual);
      });
    }
  }
}

// ✅ FUNÇÃO PARA MOSTRAR PROMPT DE INSTALAÇÃO DO PWA (CORRIGIDA)
function mostrarPromptInstalacao() {
  const existingPrompt = document.getElementById('install-prompt');
  if (existingPrompt) {
    existingPrompt.classList.add('show');
    return;
  }

  const promptDiv = document.createElement('div');
  promptDiv.id = 'install-prompt';

  promptDiv.innerHTML = `
    <div style="flex: 1;">
      <div style="font-weight: 600; color: #333; margin-bottom: 5px;">Instale nosso App!</div>
      <div style="font-size: 13px; color: #666;">Adicione à sua tela inicial para acesso rápido</div>
    </div>
    <button id="btn-cancelar-instalacao">Cancelar</button>
    <button id="btn-instalar-app">Instalar</button>
  `;

  document.body.appendChild(promptDiv);

  setTimeout(() => {
    promptDiv.classList.add('show');
  }, 10);

  document.getElementById('btn-cancelar-instalacao').addEventListener('click', () => {
    promptDiv.classList.remove('show');
    setTimeout(() => promptDiv.remove(), 400); // Espera a animação para remover
  });

  document.getElementById('btn-instalar-app').addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuário aceitou instalar o PWA');
          mostrarNotificacao("App instalado com sucesso! 🎉");
        } else {
          console.log('Usuário recusou instalar o PWA');
        }
        deferredPrompt = null;
        promptDiv.classList.remove('show');
        setTimeout(() => promptDiv.remove(), 400);
      });
    }
  });
}

// Função para formatar telefone
function formatarTelefone() {
  const input = document.getElementById("perfil-whatsapp");
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 11) {
    valor = valor.substring(0, 11);
  }

  if (valor.length > 0) {
    if (valor.length > 2 && valor.length <= 7) {
      valor = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
    } else if (valor.length > 7) {
      valor = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7)}`;
    } else if (valor.length > 2) {
      valor = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
    } else {
      valor = `(${valor}`;
    }
  }

  input.value = valor;
}

// Função para formatar CEP
function formatarCEP() {
  const input = document.getElementById("perfil-cep");
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 8) {
    valor = valor.substring(0, 8);
  }

  if (valor.length > 5) {
    valor = `${valor.substring(0, 5)}-${valor.substring(5)}`;
  }

  input.value = valor;
}

// Função auxiliar para preencher o formulário
function preencherFormularioComPerfil(perfil) {
  document.getElementById("perfil-nome").value = perfil.nome || '';
  document.getElementById("perfil-whatsapp").value = perfil.whatsapp || '';
  document.getElementById("perfil-cep").value = perfil.cep || '';
  document.getElementById("perfil-endereco").value = perfil.endereco || '';
  document.getElementById("perfil-numero").value = perfil.numero || '';
  document.getElementById("perfil-bairro").value = perfil.bairro || '';
  document.getElementById("perfil-cidade").value = perfil.cidade || '';
  document.getElementById("perfil-estado").value = perfil.estado || '';
  document.getElementById("perfil-referencia").value = perfil.referencia || ''; // ✅ ALTERAÇÃO: Adicionado o campo de referência
}

// Função para carregar perfil do localStorage E sincronizar com Firebase
async function carregarPerfil() {
  const perfilSalvoLocalStorage = localStorage.getItem('perfilCliente');
  if (perfilSalvoLocalStorage) {
    try {
      perfilCliente = JSON.parse(perfilSalvoLocalStorage);
      preencherFormularioComPerfil(perfilCliente);
    } catch(e) {
      console.error("Erro ao parsear perfil do localStorage:", e);
      localStorage.removeItem('perfilCliente');
    }
  }

  // Se temos WhatsApp, tentamos carregar do Firebase
  if (perfilCliente.whatsapp) {
    try {
      const perfilRef = ref(database, `perfis/${perfilCliente.whatsapp}`);
      const snapshot = await get(perfilRef);

      if (snapshot.exists()) {
        const perfilFirebase = snapshot.val();
        perfilCliente = { ...perfilCliente, ...perfilFirebase };

        localStorage.setItem('perfilCliente', JSON.stringify(perfilCliente));
        preencherFormularioComPerfil(perfilCliente);

        console.log("✅ Perfil sincronizado com Firebase");
      } else {
        console.log("ℹ️ Perfil não encontrado no Firebase. Usando dados do localStorage.");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar perfil do Firebase:", error);
    }
  }

  // Atualiza status do perfil na tela
  if (perfilCliente.nome && perfilCliente.whatsapp && perfilCliente.endereco && perfilCliente.numero) {
    atualizarPerfilInfo();
  }
}

// Função para buscar endereço por CEP
async function buscarEnderecoPorCEP(cep) {
  const loading = document.getElementById("cep-loading");
  const btnBuscar = document.getElementById("btn-buscar-cep");

  loading.style.display = "block";
  btnBuscar.disabled = true;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (!data.erro) {
      document.getElementById("perfil-endereco").value = data.logradouro || '';
      document.getElementById("perfil-bairro").value = data.bairro || '';
      document.getElementById("perfil-cidade").value = data.localidade || '';
      document.getElementById("perfil-estado").value = data.uf || '';
      mostrarNotificacao("Endereço encontrado!");
    } else {
      mostrarModal("CEP não encontrado", "Verifique o CEP digitado e tente novamente");
    }

  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    mostrarModal("Erro", "Não foi possível buscar o endereço. Digite manualmente.");
  } finally {
    loading.style.display = "none";
    btnBuscar.disabled = false;
  }
}

// Função para salvar o perfil do cliente no Firebase e no localStorage
async function salvarPerfil() {
  const nome = document.getElementById("perfil-nome").value.trim();
  const whatsapp = document.getElementById("perfil-whatsapp").value.trim().replace(/\D/g, '');
  const cep = document.getElementById("perfil-cep").value.trim().replace(/\D/g, '');
  const endereco = document.getElementById("perfil-endereco").value.trim();
  const numero = document.getElementById("perfil-numero").value.trim();
  const bairro = document.getElementById("perfil-bairro").value.trim();
  const cidade = document.getElementById("perfil-cidade").value.trim();
  const estado = document.getElementById("perfil-estado").value.trim();
  const referencia = document.getElementById("perfil-referencia").value.trim();
  
  // Validação: campos obrigatórios
  if (!nome || !whatsapp || !endereco || !numero) {
    mostrarModal("Campos obrigatórios", "Nome, WhatsApp, Endereço e Número são obrigatórios. Por favor, preencha-os.");
    return;
  }
  
  // Monta o objeto do perfil
  perfilCliente = {
    nome,
    whatsapp,
    cep,
    endereco,
    numero,
    bairro,
    cidade,
    estado,
    referencia
  };
  
  try {
    // Salva no Firebase usando o WhatsApp como chave (SEM FORMATAÇÃO, APENAS NÚMEROS)
    const perfilRef = ref(database, `perfis/${whatsapp}`);
    await set(perfilRef, perfilCliente);
    
    // Salva também no localStorage
    localStorage.setItem('perfilCliente', JSON.stringify(perfilCliente));
    
    // Atualiza a UI
    atualizarPerfilInfo();
    fecharPerfilModal();
    
    console.log("✅ Perfil salvo com sucesso no Firebase!");
    mostrarNotificacao("Perfil salvo com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao salvar perfil no Firebase:", error);
    mostrarModal("Erro", "Erro ao salvar no servidor. Verifique sua conexão ou permissões do Firebase.");
  }
}

// Função para fechar perfil modal
function fecharPerfilModal() {
  const modal = document.getElementById("perfil-modal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("modal-overlay")?.classList.remove("ativo");
  }
}

// Função para atualizar informações do perfil na tela
function atualizarPerfilInfo() {
  const perfilInfo = document.getElementById("perfil-info");
  const perfilStatus = document.getElementById("perfil-status");
  const formPerfil = document.getElementById("form-perfil");
  const btnSalvar = document.getElementById("btn-salvar-perfil");

  if (perfilCliente.nome && perfilCliente.whatsapp && perfilCliente.endereco && perfilCliente.numero) {
    document.getElementById("info-nome").textContent = perfilCliente.nome;
    document.getElementById("info-whatsapp").textContent = `(${perfilCliente.whatsapp.substring(0,2)}) ${perfilCliente.whatsapp.substring(2,7)}-${perfilCliente.whatsapp.substring(7)}`;
    document.getElementById("info-endereco-completo").textContent =
      `${perfilCliente.endereco}, ${perfilCliente.numero} - ${perfilCliente.bairro} - ${perfilCliente.cidade}/${perfilCliente.estado}`;
      
    // ✅ ALTERAÇÃO: Adicionado a exibição da referência
    const infoReferencia = document.getElementById("info-referencia");
    if (perfilCliente.referencia) {
        infoReferencia.textContent = `Ponto de Referência: ${perfilCliente.referencia}`;
        infoReferencia.style.display = "block";
    } else {
        infoReferencia.style.display = "none";
    }

    formPerfil.style.display = "none";
    perfilInfo.style.display = "block";
    perfilStatus.textContent = "✅ Perfil completo! Você pode fazer pedidos.";
    perfilStatus.className = "perfil-status completo";

    btnSalvar.style.display = "none";
    const btnEditar = document.createElement("button");
    btnEditar.id = "btn-editar-perfil";
    btnEditar.className = "btn-editar-perfil";
    btnEditar.textContent = "Editar Perfil";
    btnEditar.onclick = function() {
      formPerfil.style.display = "block";
      perfilInfo.style.display = "none";
      btnEditar.remove();
      btnSalvar.style.display = "block";
    };
    document.querySelector(".perfil-container")?.appendChild(btnEditar);

  } else {
    perfilInfo.style.display = "none";
    perfilStatus.textContent = "⚠️ Complete seu perfil para fazer pedidos";
    perfilStatus.className = "perfil-status";
  }
}

// Função para carregar taxa de entrega
function carregarTaxa() {
  onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      taxaEntrega = data.valor || 5.0;
      document.getElementById("taxa-entrega-modal").textContent = taxaEntrega.toFixed(2);
    }
  }, (error) => {
    console.error("Erro ao carregar taxa:", error);
  });
}

// ✅ FUNÇÃO CORRIGIDA — AÇAÍ SEMPRE EM PRIMEIRO!
function carregarProdutos() {
  const container = document.getElementById("produtos");

  // Mostra apenas um spinner simples enquanto carrega
  container.innerHTML = '<div class="loading"></div>';

  onValue(produtosRef, (snapshot) => {
    container.innerHTML = ""; // Limpa qualquer loading anterior

    if (!snapshot.exists()) {
      container.innerHTML = '<div class="sem-produtos">Nenhum produto disponível</div>';
      return;
    }

    const produtos = snapshot.val();
    const produtosArray = Object.keys(produtos).map(key => ({
      id: key,
      ...produtos[key]
    }));

    // Agrupa por categoria — usa 'Outros' apenas internamente
    const produtosPorCategoria = {};
    produtosArray.forEach(p => {
      const cat = p.categoria?.trim() || 'Outros';
      if (!produtosPorCategoria[cat]) {
        produtosPorCategoria[cat] = [];
      }
      produtosPorCategoria[cat].push(p);
    });

    // ✅ DEFINE ORDEM FIXA DAS CATEGORIAS — AÇAÍ SEMPRE PRIMEIRO!
    const ordemDesejada = [
      "Açaí",
      "Bebidas",
      "Abacaxi Temperado",
      "Sobremesas",
      "Combos",
      "Outros"
    ];

    // Filtra apenas categorias que existem no banco
    const categoriasExistentes = Object.keys(produtosPorCategoria);
    const categoriasOrdenadas = ordemDesejada.filter(cat => categoriasExistentes.includes(cat));

    // Adiciona no final categorias que não estão na lista acima (caso existam)
    categoriasExistentes.forEach(cat => {
      if (!categoriasOrdenadas.includes(cat)) {
        categoriasOrdenadas.push(cat);
      }
    });

    // Renderiza as categorias NA ORDEM DEFINIDA
    categoriasOrdenadas.forEach(categoriaNome => {
      const produtosDaCategoria = produtosPorCategoria[categoriaNome];

      // Só exibe o título da categoria se NÃO for "Outros" OU se houver outras categorias
      const unicaCategoriaEhOutros = categoriasOrdenadas.length === 1 && categoriasOrdenadas[0] === 'Outros';
      if (categoriaNome !== 'Outros' || !unicaCategoriaEhOutros) {
        const header = document.createElement("div");
        header.className = "categoria-header";
        header.innerHTML = `<h2>${categoriaNome}</h2>`;
        container.appendChild(header);
      }

      // Renderiza os cards da categoria
      produtosDaCategoria.forEach(produto => {
        const p = produto;
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.produtoId = produto.id;
        card.dataset.categoria = categoriaNome;

        let precoExibido = p.preco;
        let tagPromocao = '';
        let precoOriginal = '';

        if (p.promocao && p.promocao.ativa) {
          const dataFimPromo = new Date(p.promocao.dataFim);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          if (dataFimPromo >= hoje) {
            precoExibido = p.promocao.preco;
            tagPromocao = '<span class="tag-promocao"> PROMOÇÃO</span>';
            precoOriginal = `<span class="preco-original">R$ ${p.preco.toFixed(2)}</span>`;
          }
        }

        card.innerHTML = `
          <div class="card-img-container">
            <img src="${p.img || 'img/placeholder.png'}" alt="${p.nome}" onerror="this.src='img/placeholder.png'">
            ${tagPromocao}
          </div>
          <div class="card-body">
            <h3>${p.nome}</h3>
            <p class="produto-descricao">${p.descricao || ''}</p>
            <p class="produto-preco">
              R$ ${precoExibido.toFixed(2)}
              ${precoOriginal}
            </p>
            <button class="btn-abrir-modal" data-produto-id="${produto.id}" data-categoria="${categoriaNome}">
              Ver Detalhes
            </button>
          </div>
        `;
        container.appendChild(card);

        card.querySelector('.btn-abrir-modal').addEventListener('click', () => {
          abrirModalProduto(p, produto.id);
        });
      });
    });
  }, (error) => {
    console.error("Erro ao carregar produtos:", error);
    const container = document.getElementById("produtos");
    container.innerHTML = '<div class="sem-produtos">Erro ao carregar. Tente novamente.</div>';
  });
}

// --- FUNÇÕES DO MODAL DO PRODUTO ---
function abrirModalProduto(produto, produtoId) {
  produtoAtualModal = { ...produto, id: produtoId };

  if (complementosSalvosPorProduto[produtoId]) {
    complementosSelecionadosModal = { ...complementosSalvosPorProduto[produtoId] };
  } else {
    complementosSelecionadosModal = {};
  }

  const modal = document.getElementById('produto-modal');
  const overlay = document.getElementById('modal-overlay-produto');

  document.getElementById('modal-produto-nome').textContent = produto.nome || '';
  document.getElementById('modal-produto-img').src = produto.img || 'img/placeholder.png';
  document.getElementById('modal-produto-descricao').textContent = produto.descricao || '';

  let precoBase = produto.preco;
  if (produto.promocao && produto.promocao.ativa) {
    const dataFimPromo = new Date(produto.promocao.dataFim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataFimPromo >= hoje) {
      precoBase = produto.promocao.preco;
    }
  }
  document.getElementById('modal-produto-preco').textContent = `R$ ${precoBase.toFixed(2)}`;

  let precoTotalElement = document.getElementById('modal-produto-preco-total');
  if (!precoTotalElement) {
    const containerPrecoBase = document.querySelector('#modal-produto-preco').parentElement;
    precoTotalElement = document.createElement('div');
    precoTotalElement.id = 'modal-produto-preco-total';
    precoTotalElement.style.cssText = `
      font-size: 1.4rem;
      font-weight: bold;
      color: #ea1d2c;
      margin-top: 10px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 8px;
      display: none;
    `;
    containerPrecoBase.appendChild(precoTotalElement);
  }

  function atualizarPrecoTotalModal() {
    let totalComplementos = 0;
    Object.values(complementosSelecionadosModal).forEach(comp => {
      totalComplementos += comp.preco;
    });

    const precoTotal = precoBase + totalComplementos;

    if (totalComplementos > 0) {
      precoTotalElement.textContent = `Total com adicionais: R$ ${precoTotal.toFixed(2)}`;
      precoTotalElement.style.display = 'block';
    } else {
      precoTotalElement.style.display = 'none';
    }
  }

  const listaComponentes = document.getElementById('modal-lista-componentes');
  listaComponentes.innerHTML = '';

  const todosIngredientes = [];

  if (produto.componentes && Array.isArray(produto.componentes) && produto.componentes.length > 0) {
    produto.componentes.forEach(comp => {
      todosIngredientes.push(comp);
    });
  }

  function renderizarListaIngredientes() {
    listaComponentes.innerHTML = '';
    const ingredientesParaExibir = [...todosIngredientes];

    Object.values(complementosSelecionadosModal).forEach(comp => {
      ingredientesParaExibir.push(comp.nome);
    });

    if (ingredientesParaExibir.length > 0) {
      ingredientesParaExibir.forEach(ingrediente => {
        const li = document.createElement('li');
        li.textContent = ingrediente;
        listaComponentes.appendChild(li);
      });
    } else {
      listaComponentes.innerHTML = '<li>Nenhum ingrediente adicional incluso.</li>';
    }
  }

  const containerComplementos = document.getElementById('modal-lista-complementos');
  containerComplementos.innerHTML = '';
  if (produto.complementos && Array.isArray(produto.complementos) && produto.complementos.length > 0) {
    produto.complementos.forEach(comp => {
      const divItem = document.createElement('div');
      divItem.className = 'modal-complemento-item';
      divItem.dataset.nome = comp.nome;

      divItem.innerHTML = `
        <input type="checkbox" class="modal-complemento-checkbox" id="modal-comp-${produtoId}-${comp.nome.replace(/\s+/g, '-')}">
        <label class="modal-complemento-texto" for="modal-comp-${produtoId}-${comp.nome.replace(/\s+/g, '-')}">${comp.nome}</label>
        <span class="modal-complemento-preco">+R$ ${comp.preco.toFixed(2)}</span>
      `;

      const checkbox = divItem.querySelector('.modal-complemento-checkbox');

      if (complementosSelecionadosModal[comp.nome]) {
        checkbox.checked = true;
        divItem.classList.add('selecionado');
      }

      checkbox.addEventListener('change', function() {
        if (this.checked) {
          complementosSelecionadosModal[comp.nome] = { ...comp };
          divItem.classList.add('selecionado');
        } else {
          delete complementosSelecionadosModal[comp.nome];
          divItem.classList.remove('selecionado');
        }

        if (produtoAtualModal && produtoAtualModal.id) {
          complementosSalvosPorProduto[produtoAtualModal.id] = { ...complementosSelecionadosModal };
        }

        atualizarPrecoTotalModal();
        renderizarListaIngredientes();
      });

      containerComplementos.appendChild(divItem);
    });
  } else {
    containerComplementos.innerHTML = '<p>Nenhum complemento disponível para este produto.</p>';
  }

  overlay.style.display = 'block';
  modal.style.display = 'block';
  overlay.offsetHeight;
  modal.offsetHeight;
  overlay.classList.add('ativo');
  modal.classList.add('ativo');

  atualizarPrecoTotalModal();
}

function fecharModalProduto() {
  const modal = document.getElementById('produto-modal');
  const overlay = document.getElementById('modal-overlay-produto');

  overlay.classList.remove('ativo');
  modal.classList.remove('ativo');

  setTimeout(() => {
    if (!overlay.classList.contains('ativo')) {
      overlay.style.display = 'none';
      modal.style.display = 'none';
    }
  }, 300);
}

function fecharModalProdutoComReset() {
  if (produtoAtualModal && produtoAtualModal.id) {
    delete complementosSalvosPorProduto[produtoAtualModal.id];
  }

  complementosSelecionadosModal = {};

  const checkboxes = document.querySelectorAll('.modal-complemento-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });

  const itensComplemento = document.querySelectorAll('.modal-complemento-item');
  itensComplemento.forEach(item => {
    item.classList.remove('selecionado');
  });

  const precoTotalElement = document.getElementById('modal-produto-preco-total');
  if (precoTotalElement) {
    precoTotalElement.style.display = 'none';
  }

  fecharModalProduto();
}

function adicionarCarrinho(produtoId, nome, precoBase, complementosSelecionados = []) {
  if (!lojaAberta()) {
    mostrarModal("Loja Fechada", "Pedidos só podem ser feitos entre 17:00 e 23:30");
    return;
  }

  let totalComplementos = 0;
  complementosSelecionados.forEach(comp => {
    totalComplementos += comp.preco;
  });

  const totalItem = precoBase + totalComplementos;

  carrinho.push({
    id: produtoId,
    nome,
    preco: precoBase,
    complementos: complementosSelecionados,
    total: totalItem
  });

  atualizarCarrinhoFlutuante();
  mostrarNotificacao("Item adicionado ao carrinho!");
}

function adicionarProdutoDoModalAoCarrinho() {
  if (!produtoAtualModal) {
    console.error("Nenhum produto selecionado para adicionar ao carrinho via modal.");
    mostrarNotificacao("Erro: Produto não selecionado.");
    return;
  }

  let precoBase = produtoAtualModal.preco;
  if (produtoAtualModal.promocao && produtoAtualModal.promocao.ativa) {
    const dataFimPromo = new Date(produtoAtualModal.promocao.dataFim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataFimPromo >= hoje) {
      precoBase = produtoAtualModal.promocao.preco;
    }
  }

  const complementosArray = Object.values(complementosSelecionadosModal);

  adicionarCarrinho(produtoAtualModal.id, produtoAtualModal.nome, precoBase, complementosArray);

  if (produtoAtualModal && produtoAtualModal.id) {
    delete complementosSalvosPorProduto[produtoAtualModal.id];
  }

  fecharModalProduto();
  mostrarNotificacao("Item adicionado ao carrinho!");
}

function removerItemCarrinho(index) {
  carrinho.splice(index, 1);
  renderizarCarrinhoModal();
  atualizarCarrinhoFlutuante();
  mostrarNotificacao("Item removido!");
}

function atualizarCarrinhoFlutuante() {
  const carrinhoFlutuante = document.getElementById("carrinho-flutuante");
  const itensCount = document.getElementById("carrinho-itens-count");
  const totalValor = document.getElementById("carrinho-total-valor");

  if (carrinho.length > 0) {
    carrinhoFlutuante.classList.add("ativo");
    const total = carrinho.reduce((sum, item) => sum + item.total, 0) + taxaEntrega;
    itensCount.textContent = `${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'}`;
    totalValor.textContent = total.toFixed(2);
  } else {
    carrinhoFlutuante.classList.remove("ativo");
  }
}

function abrirCarrinho() {
  document.getElementById("carrinho-modal").classList.add("ativo");
  document.getElementById("modal-overlay").classList.add("ativo");
  renderizarCarrinhoModal();
}

function fecharCarrinho() {
  document.getElementById("carrinho-modal").classList.remove("ativo");
  document.getElementById("modal-overlay").classList.remove("ativo");
}

function renderizarCarrinhoModal() {
  const lista = document.getElementById("lista-carrinho-modal");
  const subtotalElement = document.getElementById("subtotal-modal");
  const totalElement = document.getElementById("total-modal");

  lista.innerHTML = "";

  if (carrinho.length === 0) {
    lista.innerHTML = '<li class="carrinho-vazio-modal">Seu carrinho está vazio</li>';
    subtotalElement.textContent = "0.00";
    totalElement.textContent = taxaEntrega.toFixed(2);
    document.getElementById("btn-finalizar-modal").disabled = true;
    return;
  }

  let subtotal = 0;

  carrinho.forEach((item, index) => {
    subtotal += item.total;
    const li = document.createElement("li");
    li.className = "item-carrinho-modal";

    let complementosTexto = "";
    if (item.complementos && item.complementos.length > 0) {
      complementosTexto = `<div class="item-complementos-modal">`;
      item.complementos.forEach(comp => {
        complementosTexto += `<div>+ ${comp.nome} (+R$ ${comp.preco.toFixed(2)})</div>`;
      });
      complementosTexto += `</div>`;
    }

    li.innerHTML = `
      <div class="item-info-modal">
        <div class="item-nome-modal">${item.nome}</div>
        ${complementosTexto}
        <div class="item-valor-modal">R$ ${item.total.toFixed(2)}</div>
      </div>
      <button onclick="removerItemCarrinho(${index})" class="btn-remover-modal" title="Remover item">×</button>
    `;
    lista.appendChild(li);
  });

  subtotalElement.textContent = subtotal.toFixed(2);
  totalElement.textContent = (subtotal + taxaEntrega).toFixed(2);
  document.getElementById("btn-finalizar-modal").disabled = false;
}

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");

  document.querySelectorAll(".nav-button").forEach(btn => btn.classList.remove("active"));
  if (id === 'tela-cardapio') {
    document.getElementById("btn-cardapio").classList.add("active");
  } else if (id === 'tela-perfil') {
    document.getElementById("btn-perfil").classList.add("active");
  } else {
    document.getElementById("btn-pedidos").classList.add("active");
    atualizarPedidosCliente();
  }

  if (id === 'tela-pedido') {
    if (!perfilCliente.nome || !perfilCliente.whatsapp || !perfilCliente.endereco || !perfilCliente.numero) {
      mostrarModal("Perfil incompleto", "Por favor, complete seu perfil antes de ver os pedidos.");
      mostrarTela('tela-perfil');
      return;
    }
  }
}

function formatarComandaWhatsApp(pedido) {
  const data = new Date().toLocaleDateString('pt-BR');
  const hora = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});

  let msg = `🏪 *${NOME_EMPRESA} - NOVO PEDIDO*\n`;
  msg += `🔢 Pedido: #${pedido.numero}\n`;
  msg += `📅 Data: ${data} às ${hora}\n`;
  msg += `\n`;
  msg += `👤 *CLIENTE:*\n`;
  msg += `Nome: ${pedido.cliente.nome}\n`;
  msg += ` WhatsApp: (${pedido.cliente.whatsapp.substring(0,2)}) ${pedido.cliente.whatsapp.substring(2,7)}-${pedido.cliente.whatsapp.substring(7)}\n`;
  msg += ` Endereço: ${pedido.cliente.endereco}, ${pedido.cliente.numero} - ${pedido.cliente.bairro}\n`;
  if (pedido.cliente.referencia) { // ✅ ALTERAÇÃO: Adicionado o ponto de referência se ele existir
      msg += ` Ponto de Ref: ${pedido.cliente.referencia}\n`;
  }
  msg += ` Cidade: ${pedido.cliente.cidade}/${pedido.cliente.estado}\n`;
  msg += ` CEP: ${pedido.cliente.cep.substring(0,5)}-${pedido.cliente.cep.substring(5)}\n`;
  msg += `\n`;
  msg += `📋 *ITENS:*\n`;
  msg += `━━━━━━━━━━━━━━\n`;

  pedido.itens.forEach((item, index) => {
    msg += `${index + 1}. ${item.nome} - R$ ${item.preco.toFixed(2)}\n`;

    if (item.complementos && item.complementos.length > 0) {
      item.complementos.forEach(comp => {
        msg += `   ➕ ${comp.nome} (+R$ ${comp.preco.toFixed(2)})\n`;
      });
    }

    msg += `   💰 Subtotal: R$ ${item.total.toFixed(2)}\n\n`;
  });

  msg += `━━━━━━━━━━━━━━\n`;
  msg += `💰 *TOTAL: R$ ${pedido.total.toFixed(2)}*\n`;
  msg += `   Subtotal: R$ ${pedido.subtotal.toFixed(2)}\n`;
  msg += `   Taxa entrega: R$ ${pedido.taxaEntrega.toFixed(2)}\n`;
  msg += `\n`;
  msg += `🚦 *STATUS:* ${pedido.status}\n`;

  return msg;
}

document.getElementById("btn-finalizar-modal").addEventListener("click", async () => {
  if (carrinho.length === 0) return;

  if (!lojaAberta()) {
    mostrarModal("Loja Fechada", "Pedidos só podem ser feitos entre 18:00 e 23:30");
    return;
  }

  if (!perfilCliente.nome || !perfilCliente.whatsapp || !perfilCliente.endereco || !perfilCliente.numero) {
    mostrarModal("Perfil incompleto", "Por favor, complete seu perfil antes de finalizar o pedido.");
    mostrarTela('tela-perfil');
    return;
  }

  const subtotal = carrinho.reduce((t, i) => t + i.total, 0);
  const total = subtotal + taxaEntrega;
  const numeroPedidoAtual = numeroPedido++;

  const pedido = {
    numero: numeroPedidoAtual,
    cliente: {
      nome: perfilCliente.nome,
      whatsapp: perfilCliente.whatsapp,
      cep: perfilCliente.cep,
      endereco: perfilCliente.endereco,
      numero: perfilCliente.numero,
      bairro: perfilCliente.bairro,
      cidade: perfilCliente.cidade,
      estado: perfilCliente.estado,
      referencia: perfilCliente.referencia
    },
    itens: [...carrinho],
    subtotal: subtotal,
    taxaEntrega: taxaEntrega,
    total: total,
    status: "Recebido",
    createdAt: new Date().toISOString(),
    dataPedido: new Date().toLocaleString('pt-BR')
  };

  try {
    const newPedidoRef = push(pedidosRef);
    await set(newPedidoRef, pedido);

    const mensagemComanda = formatarComandaWhatsApp(pedido);
    mostrarModalEnvioManual(mensagemComanda, pedido);

    carrinho = [];
    atualizarCarrinhoFlutuante();
    renderizarCarrinhoModal();
    fecharCarrinho();

  } catch(e) {
    console.error("Erro ao enviar pedido:", e);
    mostrarModal("Erro", "Erro ao processar pedido. Tente novamente.");
  }
});

function mostrarModalEnvioManual(mensagem, pedido) {
  const modaisAntigos = document.querySelectorAll('.modal-overlay-temp');
  modaisAntigos.forEach(modal => modal.remove());

  const mensagemCodificada = encodeURIComponent(mensagem);
  const urlWhatsApp = `https://wa.me/${WHATSAPP_EMPRESA}?text=${mensagemCodificada}`;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay-temp';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-temp';
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    max-width: 95%;
    width: 500px;
    text-align: center;
    position: relative;
    margin: auto;
    max-height: 90vh;
    overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <h3 style="margin-top: 0; color: #2c3e50; font-size: 1.5rem;">📋 Pedido #${pedido.numero} Preparado!</h3>
    <p style="color: #555; margin-bottom: 20px;">Copie e cole no WhatsApp ou clique no botão abaixo:</p>

    <div class="comanda-texto" id="comanda-texto" style="
      text-align: left;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      max-height: 250px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      border: 1px solid #e9ecef;
      white-space: pre-wrap;
      word-break: break-word;
    ">${mensagem}</div>
    <button onclick="this.closest('.modal-overlay-temp').remove()"
            style="
              padding: 12px 24px;
              background: #6c757d;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              width: 100%;
              margin-top: 10px;
            ">
      Fechar
    </button>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

function copiarComanda() {
  const comandaTexto = document.getElementById('comanda-texto').innerText;
  navigator.clipboard.writeText(comandaTexto).then(() => {
    mostrarNotificacao("Comanda copiada! Cole no WhatsApp");
  }).catch(err => {
    console.error('Erro ao copiar: ', err);
    mostrarNotificacao("Erro ao copiar a comanda.");
  });
}

function lojaAberta() {
  const agora = new Date();
  const hora = agora.getHours();
  const minutos = agora.getMinutes();
  const horarioDecimal = hora + minutos/60;
  return horarioDecimal >= 17 && horarioDecimal <= 23.5;
}

function atualizarStatusLoja() {
  const statusEl = document.getElementById("status-loja");

  if (!statusEl) return;

  if (lojaAberta()) {
    statusEl.innerHTML = "🟢 <strong>ABERTO</strong> - 17:00 às 23:30";
    statusEl.style.color = "white";
  } else {
    statusEl.innerHTML = "🔴 <strong>FECHADO</strong> - 17:00 às 23:30";
    statusEl.style.color = "#ffcccc";
  }
}

function atualizarPedidosCliente() {
  onValue(pedidosRef, (snapshot) => {
    const lista = document.getElementById("lista-pedidos-cliente");
    lista.innerHTML = "";

    if (!snapshot.exists()) {
      lista.innerHTML = '<li class="sem-pedidos">Você ainda não fez pedidos</li>';
      return;
    }

    const pedidos = snapshot.val();
    const pedidosArray = [];

    Object.keys(pedidos).forEach(pedidoId => {
      const pedido = pedidos[pedidoId];
      if (pedido.cliente && pedido.cliente.whatsapp === perfilCliente.whatsapp) {
        pedidosArray.push({ id: pedidoId, ...pedido });
      }
    });

    if (pedidosArray.length === 0) {
      lista.innerHTML = '<li class="sem-pedidos">Você ainda não fez pedidos</li>';
      return;
    }

    pedidosArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    pedidosArray.forEach(p => {
      const li = document.createElement("li");
      li.className = "pedido-item";

      let statusClass = "";
      switch(p.status) {
        case "Recebido": statusClass = "status-recebido"; break;
        case "Preparando": statusClass = "status-preparando"; break;
        case "Saiu para entrega": statusClass = "status-entrega"; break;
        case "Entregue": statusClass = "status-entregue"; break;
        default: statusClass = "status-recebido";
      }

      li.innerHTML = `
        <div class="pedido-header">
          <span class="pedido-numero">Pedido #${p.numero || p.id.substring(0,6)}</span>
          <span class="pedido-status ${statusClass}">${p.status}</span>
        </div>
        <div class="pedido-info">
          <div class="pedido-detalhe">
            <div class="pedido-detalhe-label">Data</div>
            <div class="pedido-detalhe-valor">${p.dataPedido || 'N/A'}</div>
          </div>
          <div class="pedido-detalhe">
            <div class="pedido-detalhe-label">Total</div>
            <div class="pedido-detalhe-valor">R$ ${p.total?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      `;
      lista.appendChild(li);
    });
  });
}

// ✅ FUNÇÃO ATUALIZADA — CENTRALIZADA, ANIMADA, COM .modal-overlay e .modal-box
function mostrarModal(titulo, mensagem) {
  // Remove modais anteriores (evita duplicação)
  const overlayAntigo = document.querySelector('.modal-overlay');
  if (overlayAntigo) overlayAntigo.remove();

  // Cria o overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Cria o box do modal
  const box = document.createElement('div');
  box.className = 'modal-box';

  // Conteúdo do modal
  box.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: var(--primary-color);">${titulo}</h3>
    <p style="margin: 0 0 25px 0; font-size: 1rem; color: var(--text-secondary); line-height: 1.5;">${mensagem}</p>
    <button class="btn-abrir-modal" onclick="fecharModal()">
      OK
    </button>
  `;

  // Monta e adiciona ao body
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Força reflow para animação funcionar e adiciona a classe 'ativo'
  setTimeout(() => {
    overlay.classList.add('ativo');
  }, 10);

  // Fecha ao clicar fora do modal-box
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      fecharModal();
    }
  });

  // Fecha com a tecla ESC
  document.addEventListener('keydown', function fecharComEsc(e) {
    if (e.key === 'Escape') {
      fecharModal();
      document.removeEventListener('keydown', fecharComEsc);
    }
  });
}

// ✅ FUNÇÃO GLOBAL PARA FECHAR O MODAL
function fecharModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.classList.remove('ativo');
    // Remove o modal do DOM após a animação
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    }, 300);
  }
}

// --- FUNÇÃO PARA MOSTRAR A NOTIFICAÇÃO TOAST ---
function mostrarNotificacao(mensagem) {
  // Remove a notificação antiga se ela estiver visível
  const notificacoesAntigas = document.querySelectorAll('.notificacao-temp');
  notificacoesAntigas.forEach(notif => notif.remove());

  // Cria a notificação com a nova estrutura e classe
  const notif = document.createElement('div');
  notif.id = 'toast-notificacao'; // Usamos o ID que definimos no HTML
  notif.innerHTML = `<span>${mensagem}</span>`;

  document.body.appendChild(notif);

  // Força reflow e adiciona a classe que ativa a animação
  notif.offsetHeight; // Truque para forçar o navegador a renderizar a notificação
  notif.classList.add('mostrar');

  // Faz a notificação desaparecer depois de 3 segundos
  setTimeout(() => {
    notif.classList.remove('mostrar');
    // Remove o elemento do DOM após a animação de saída
    setTimeout(() => {
      notif.remove();
    }, 500); // O tempo precisa ser o mesmo da transição CSS
  }, 3000); // 3000ms = 3 segundos
}

