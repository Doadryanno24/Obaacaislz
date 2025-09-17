import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set
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

let carrinho = [];
let taxaEntrega = 5.0;
let numeroPedido = 1;
let perfilCliente = {
  nome: '',
  whatsapp: '',
  cep: '',
  endereco: '',
  numero: '', // Novo campo
  bairro: '',
  cidade: '',
  estado: ''
};

// --- Variáveis globais para o modal do produto ---
let produtoAtualModal = null;
let complementosSelecionadosModal = {};
let complementosSalvosPorProduto = {};

// -------------------- FUNÇÕES -------------------- //

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

//REGISTRA SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.error('Falha ao registrar SW:', err));
  });
}

//BOTAO INSTALAR 
let promptInstalacao;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptInstalacao = e;

  document.addEventListener("splashFinalizada", () => {
    if (sessionStorage.getItem("instalarModalMostrado")) return;
    sessionStorage.setItem("instalarModalMostrado", "true");

    const modal = document.getElementById("instalar-modal");
    modal.style.display = "flex";

    document.getElementById("btn-confirmar-instalar").addEventListener("click", () => {
      modal.style.display = "none";
      promptInstalacao.prompt();
      promptInstalacao.userChoice.then((resultado) => {
        if (resultado.outcome === "accepted") {
          console.log("✅ Usuário aceitou instalar");
        } else {
          console.log("❌ Usuário recusou instalar");
        }
        promptInstalacao = null;
      });
    });

    document.getElementById("btn-fechar-instalar").addEventListener("click", () => {
      modal.style.display = "none";
    });
  });
});

// Inicialização
window.addEventListener("DOMContentLoaded", () => {
  carregarTaxa();
  carregarProdutos();
  atualizarStatusLoja();
  carregarPerfil();
  setInterval(atualizarStatusLoja, 60000);

  document.getElementById("btn-salvar-perfil").addEventListener("click", salvarPerfil);
  document.getElementById("btn-buscar-cep").addEventListener("click", () => {
    const cep = document.getElementById("perfil-cep").value.replace(/\D/g, '');
    if (cep.length === 8) {
      buscarEnderecoPorCEP(cep);
    } else {
      mostrarModal("CEP inválido", "Digite um CEP válido com 8 dígitos");
    }
  });

  document.getElementById("btn-ver-carrinho").addEventListener("click", abrirCarrinho);
  document.getElementById("btn-fechar-carrinho").addEventListener("click", fecharCarrinho);

  document.getElementById("perfil-whatsapp").addEventListener("input", formatarTelefone);
  document.getElementById("perfil-cep").addEventListener("input", formatarCEP);

  document.getElementById('btn-fechar-modal-produto').addEventListener('click', fecharModalProdutoComReset);
  document.getElementById('modal-overlay-produto').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay-produto')) {
      fecharModalProduto();
    }
  });
  document.getElementById('btn-adicionar-ao-carrinho-modal').addEventListener('click', adicionarProdutoDoModalAoCarrinho);
});

function formatarTelefone() {
  const input = document.getElementById("perfil-whatsapp");
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 11) valor = valor.substring(0, 11);

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

function formatarCEP() {
  const input = document.getElementById("perfil-cep");
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 8) valor = valor.substring(0, 8);

  if (valor.length > 5) {
    valor = `${valor.substring(0, 5)}-${valor.substring(5)}`;
  }

  input.value = valor;
}

function carregarPerfil() {
  const perfilSalvo = localStorage.getItem('perfilCliente');
  if (perfilSalvo) {
    perfilCliente = JSON.parse(perfilSalvo);
    document.getElementById("perfil-nome").value = perfilCliente.nome || '';
    document.getElementById("perfil-whatsapp").value = perfilCliente.whatsapp || '';
    document.getElementById("perfil-cep").value = perfilCliente.cep || '';
    document.getElementById("perfil-endereco").value = perfilCliente.endereco || '';
    document.getElementById("perfil-numero").value = perfilCliente.numero || ''; // Carrega número
    document.getElementById("perfil-bairro").value = perfilCliente.bairro || '';
    document.getElementById("perfil-cidade").value = perfilCliente.cidade || '';
    document.getElementById("perfil-estado").value = perfilCliente.estado || '';

    if (perfilCliente.nome && perfilCliente.whatsapp && perfilCliente.endereco && perfilCliente.numero) {
      atualizarPerfilInfo();
    }
  }
}

async function buscarEnderecoPorCEP(cep) {
  const loading = document.getElementById("cep-loading");
  const btnBuscar = document.getElementById("btn-buscar-cep");

  loading.style.display = "block";
  btnBuscar.disabled = true;

  try {
    // 🔴 CORREÇÃO AQUI: REMOVIDO ESPAÇO NA URL
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

function salvarPerfil() {
  const nome = document.getElementById("perfil-nome").value.trim();
  const whatsapp = document.getElementById("perfil-whatsapp").value.replace(/\D/g, '');
  const cep = document.getElementById("perfil-cep").value.replace(/\D/g, '');
  const endereco = document.getElementById("perfil-endereco").value.trim();
  const numero = document.getElementById("perfil-numero").value.trim(); // Captura número
  const bairro = document.getElementById("perfil-bairro").value.trim();
  const cidade = document.getElementById("perfil-cidade").value.trim();
  const estado = document.getElementById("perfil-estado").value;

  if (!nome) return mostrarModal("Campo obrigatório", "Digite seu nome completo");
  if (!whatsapp || whatsapp.length < 10 || whatsapp.length > 11) return mostrarModal("WhatsApp inválido", "Digite um WhatsApp válido");
  if (!cep || cep.length !== 8) return mostrarModal("CEP inválido", "Digite um CEP válido com 8 dígitos");
  if (!endereco) return mostrarModal("Campo obrigatório", "Digite seu endereço");
  if (!numero) return mostrarModal("Campo obrigatório", "Digite o número do endereço");
  if (!bairro) return mostrarModal("Campo obrigatório", "Digite seu bairro");
  if (!cidade) return mostrarModal("Campo obrigatório", "Digite sua cidade");
  if (!estado) return mostrarModal("Campo obrigatório", "Selecione seu estado");

  perfilCliente = { nome, whatsapp, cep, endereco, numero, bairro, cidade, estado };
  localStorage.setItem('perfilCliente', JSON.stringify(perfilCliente));
  atualizarPerfilInfo();
  mostrarNotificacao("Perfil salvo com sucesso!");
}

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

function carregarProdutos() {
  onValue(produtosRef, (snapshot) => {
    const container = document.getElementById("produtos");
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = '<div class="loading">Nenhum produto disponível</div>';
      return;
    }

    const produtos = snapshot.val();
    Object.keys(produtos).forEach(produtoId => {
      const p = produtos[produtoId];
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.produtoId = produtoId;

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
          <button class="btn-abrir-modal" data-produto-id="${produtoId}">
            Ver Detalhes / Adicionar
          </button>
        </div>
      `;
      container.appendChild(card);

      card.querySelector('.btn-abrir-modal').addEventListener('click', () => {
        abrirModalProduto(p, produtoId);
      });
    });
  }, (error) => {
    console.error("Erro ao carregar produtos:", error);
    document.getElementById("produtos").innerHTML = '<div class="loading">Erro ao carregar produtos</div>';
  });
}

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

  const listaComponentes = document.getElementById('modal-lista-componentes');
  listaComponentes.innerHTML = '';

  const todosIngredientes = [];
  if (produto.componentes && Array.isArray(produto.componentes)) {
    produto.componentes.forEach(comp => todosIngredientes.push(comp));
  }

  renderizarListaIngredientes();

  function renderizarListaIngredientes() {
    listaComponentes.innerHTML = '';
    const ingredientesParaExibir = [...todosIngredientes];
    Object.values(complementosSelecionadosModal).forEach(comp => {
      ingredientesParaExibir.push(typeof comp === 'string' ? comp : comp.nome);
    });

    if (ingredientesParaExibir.length > 0) {
      ingredientesParaExibir.forEach(ingrediente => {
        const li = document.createElement('li');
        li.textContent = ingrediente;
        listaComponentes.appendChild(li);
      });
    } else {
      listaComponentes.innerHTML = '<li>Nenhum ingrediente incluso.</li>';
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

        renderizarListaIngredientes();
      });

      containerComplementos.appendChild(divItem);
    });
  } else {
    containerComplementos.innerHTML = '<p>Nenhum complemento disponível.</p>';
  }

  overlay.style.display = 'block';
  modal.style.display = 'block';
  overlay.offsetHeight;
  modal.offsetHeight;
  overlay.classList.add('ativo');
  modal.classList.add('ativo');
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

  document.querySelectorAll('.modal-complemento-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  document.querySelectorAll('.modal-complemento-item').forEach(item => {
    item.classList.remove('selecionado');
  });

  const precoTotalElement = document.getElementById('modal-produto-preco-total');
  if (precoTotalElement) precoTotalElement.style.display = 'none';

  fecharModalProduto();
}

function adicionarCarrinho(produtoId, nome, precoBase, complementosSelecionados = []) {
  if (!lojaAberta()) {
    mostrarModal("Loja Fechada", "Pedidos só podem ser feitos entre 18:00 e 23:30");
    return;
  }

  const totalComplementos = complementosSelecionados.reduce((sum, c) => sum + c.preco, 0);
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
  document.getElementById(`btn-${id.split('-')[1]}`).classList.add("active");

  if (id === 'tela-pedido') {
    if (!perfilCliente.nome || !perfilCliente.whatsapp || !perfilCliente.endereco || !perfilCliente.numero) {
      mostrarModal("Perfil incompleto", "Por favor, complete seu perfil antes de ver os pedidos.");
      mostrarTela('tela-perfil');
      return;
    }
    atualizarPedidosCliente();
  }
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
    cliente: { ...perfilCliente },
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

    mostrarModal(
      "✅ Pedido Recebido!",
      `Seu pedido #${numeroPedidoAtual} foi registrado com sucesso!\n\nA loja será notificada.\nAcompanhe o status em "Meus Pedidos".`
    );

    carrinho = [];
    atualizarCarrinhoFlutuante();
    renderizarCarrinhoModal();
    fecharCarrinho();
  } catch(e) {
    console.error("Erro:", e);
    mostrarModal("Erro", "Erro ao processar pedido. Tente novamente.");
  }
});

function lojaAberta() {
  const agora = new Date();
  const hora = agora.getHours();
  const minutos = agora.getMinutes();
  const horarioDecimal = hora + minutos/60;
  return horarioDecimal >= 18 && horarioDecimal <= 23.5;
}

function atualizarStatusLoja() {
  const statusEl = document.getElementById("status-loja");
  if (!statusEl) return;

  if (lojaAberta()) {
    statusEl.innerHTML = "🟢 <strong>ABERTO</strong> - 18:00 às 23:30";
    statusEl.style.color = "white";
  } else {
    statusEl.innerHTML = "🔴 <strong>FECHADO</strong> - 18:00 às 23:30";
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

function mostrarModal(titulo, mensagem) {
  const modaisAntigos = document.querySelectorAll('.modal-overlay-temp');
  modaisAntigos.forEach(modal => modal.remove());

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay-temp';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center;
    align-items: center; z-index: 10000; padding: 20px; box-sizing: border-box;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-temp';
  modalContent.style.cssText = `
    background: white; padding: 30px; border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 90%; width: 450px;
    text-align: center; margin: auto; max-height: 90vh; overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">${titulo}</h3>
    <p style="color: #666; line-height: 1.6; margin: 20px 0;">${mensagem}</p>
    <button onclick="this.closest('.modal-overlay-temp').remove()"
            style="margin-top: 20px; padding: 12px 24px; background: #007bff; color: white;
            border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
      Fechar
    </button>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

function mostrarNotificacao(mensagem) {
  const notificacoesAntigas = document.querySelectorAll('.notificacao-temp');
  notificacoesAntigas.forEach(notif => notif.remove());

  const notif = document.createElement('div');
  notif.className = 'notificacao-temp';
  notif.textContent = mensagem;
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #ea1d2c; color: white;
    padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 2000; transform: translateX(400px); transition: transform 0.3s ease;
    font-weight: 500; max-width: 300px;
  `;
  document.body.appendChild(notif);

  setTimeout(() => notif.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    notif.style.transform = 'translateX(400px)';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
  }
