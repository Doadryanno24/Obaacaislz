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
// --- MODIFICAÇÃO: Adicionando 'numero' ao objeto perfilCliente ---
let perfilCliente = {
  nome: '',
  whatsapp: '',
  cep: '',
  endereco: '',
  numero: '', // --- NOVA PROPRIEDADE ---
  bairro: '',
  cidade: '',
  estado: ''
};
// --- FIM DA MODIFICAÇÃO ---

// --- Variáveis globais para o modal do produto ---
let produtoAtualModal = null;
let complementosSelecionadosModal = {}; // Estado temporário durante a sessão do modal
let complementosSalvosPorProduto = {};  // Estado persistente por produto (só reseta no X ou ao adicionar)

// -------------------- FUNÇÕES -------------------- //

// Funções globais
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

//REGISTRA SERVICE WORKER
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
});

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

// Função para carregar perfil do localStorage
function carregarPerfil() {
  const perfilSalvo = localStorage.getItem('perfilCliente');
  if (perfilSalvo) {
    perfilCliente = JSON.parse(perfilSalvo);
    document.getElementById("perfil-nome").value = perfilCliente.nome || '';
    document.getElementById("perfil-whatsapp").value = perfilCliente.whatsapp || '';
    document.getElementById("perfil-cep").value = perfilCliente.cep || '';
    document.getElementById("perfil-endereco").value = perfilCliente.endereco || '';
    // --- MODIFICAÇÃO: Carregar o número ---
    document.getElementById("perfil-numero").value = perfilCliente.numero || '';
    // --- FIM DA MODIFICAÇÃO ---
    document.getElementById("perfil-bairro").value = perfilCliente.bairro || '';
    document.getElementById("perfil-cidade").value = perfilCliente.cidade || '';
    document.getElementById("perfil-estado").value = perfilCliente.estado || '';

    // --- MODIFICAÇÃO: Verificar número também para considerar o perfil completo ---
    if (perfilCliente.nome && perfilCliente.whatsapp && perfilCliente.endereco && perfilCliente.numero) {
      atualizarPerfilInfo();
    }
  }
}

// Função para buscar endereço por CEP - CORRIGIDA
async function buscarEnderecoPorCEP(cep) {
  const loading = document.getElementById("cep-loading");
  const btnBuscar = document.getElementById("btn-buscar-cep");

  loading.style.display = "block";
  btnBuscar.disabled = true;

  try {
    // Corrigido: URL do ViaCEP sem espaço
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

// Função para salvar perfil
function salvarPerfil() {
  const nome = document.getElementById("perfil-nome").value.trim();
  const whatsapp = document.getElementById("perfil-whatsapp").value.replace(/\D/g, '');
  const cep = document.getElementById("perfil-cep").value.replace(/\D/g, '');
  const endereco = document.getElementById("perfil-endereco").value.trim();
  // --- MODIFICAÇÃO: Obter o número ---
  const numero = document.getElementById("perfil-numero").value.trim();
  // --- FIM DA MODIFICAÇÃO ---
  const bairro = document.getElementById("perfil-bairro").value.trim();
  const cidade = document.getElementById("perfil-cidade").value.trim();
  const estado = document.getElementById("perfil-estado").value;

  // Validações
  if (!nome) {
    mostrarModal("Campo obrigatório", "Por favor, digite seu nome completo");
    return;
  }

  if (!whatsapp || whatsapp.length < 10 || whatsapp.length > 11) {
    mostrarModal("WhatsApp inválido", "Digite um WhatsApp válido com 10 ou 11 dígitos");
    return;
  }

  if (!cep || cep.length !== 8) {
    mostrarModal("CEP inválido", "Digite um CEP válido com 8 dígitos");
    return;
  }

  if (!endereco) {
    mostrarModal("Campo obrigatório", "Por favor, digite seu endereço");
    return;
  }

  // --- MODIFICAÇÃO: Validar o número ---
  if (!numero) {
     mostrarModal("Campo obrigatório", "Por favor, digite o número da sua casa.");
     return;
   }
  // --- FIM DA MODIFICAÇÃO ---

  if (!bairro) {
    mostrarModal("Campo obrigatório", "Por favor, digite seu bairro");
    return;
  }

  if (!cidade) {
    mostrarModal("Campo obrigatório", "Por favor, digite sua cidade");
    return;
  }

  if (!estado) {
    mostrarModal("Campo obrigatório", "Por favor, selecione seu estado");
    return;
  }

  // --- MODIFICAÇÃO: Incluir 'numero' no objeto perfilCliente ---
  perfilCliente = {
    nome: nome,
    whatsapp: whatsapp,
    cep: cep,
    endereco: endereco,
    numero: numero, // --- NOVA PROPRIEDADE ---
    bairro: bairro,
    cidade: cidade,
    estado: estado
  };
  // --- FIM DA MODIFICAÇÃO ---

  localStorage.setItem('perfilCliente', JSON.stringify(perfilCliente));
  atualizarPerfilInfo();
  mostrarNotificacao("Perfil salvo com sucesso!");
}

// Função para atualizar informações do perfil na tela
function atualizarPerfilInfo() {
  const perfilInfo = document.getElementById("perfil-info");
  const perfilStatus = document.getElementById("perfil-status");
  const formPerfil = document.getElementById("form-perfil");
  const btnSalvar = document.getElementById("btn-salvar-perfil");

  // --- MODIFICAÇÃO: Verificar número também para considerar o perfil completo ---
  if (perfilCliente.nome && perfilCliente.whatsapp && perfilCliente.endereco && perfilCliente.numero) {
    document.getElementById("info-nome").textContent = perfilCliente.nome;
    document.getElementById("info-whatsapp").textContent = `(${perfilCliente.whatsapp.substring(0,2)}) ${perfilCliente.whatsapp.substring(2,7)}-${perfilCliente.whatsapp.substring(7)}`;
    // --- MODIFICAÇÃO: Exibir o número junto com o endereço ---
    document.getElementById("info-endereco-completo").textContent =
      `${perfilCliente.endereco}, ${perfilCliente.numero} - ${perfilCliente.bairro} - ${perfilCliente.cidade}/${perfilCliente.estado}`;
    // --- FIM DA MODIFICAÇÃO ---

    // Ocultar formulário e mostrar informações
    formPerfil.style.display = "none";
    perfilInfo.style.display = "block";
    perfilStatus.textContent = "✅ Perfil completo! Você pode fazer pedidos.";
    perfilStatus.className = "perfil-status completo";

    // Substituir botão salvar por botão editar
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

// Carregar produtos em tempo real
function carregarProdutos() {
  onValue(produtosRef, (snapshot) => {
    console.log("Dados dos produtos recebidos:", snapshot.val());
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

      // Verificar se o produto está em promoção
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

      // Adiciona evento de clique ao botão do card
      card.querySelector('.btn-abrir-modal').addEventListener('click', () => {
        abrirModalProduto(p, produtoId);
      });
    });

  }, (error) => {
    console.error("Erro ao carregar produtos:", error);
    document.getElementById("produtos").innerHTML = '<div class="loading">Erro ao carregar produtos</div>';
  });
}

// Função para abrir o modal com os detalhes do produto
function abrirModalProduto(produto, produtoId) {
  produtoAtualModal = { ...produto, id: produtoId };

  // Carrega os complementos salvos para este produto, se existirem
  if (complementosSalvosPorProduto[produtoId]) {
    complementosSelecionadosModal = { ...complementosSalvosPorProduto[produtoId] };
  } else {
    complementosSelecionadosModal = {};
  }

  const modal = document.getElementById('produto-modal');
  const overlay = document.getElementById('modal-overlay-produto');

  // Preencher informações básicas
  document.getElementById('modal-produto-nome').textContent = produto.nome || '';
  document.getElementById('modal-produto-img').src = produto.img || 'img/placeholder.png';
  document.getElementById('modal-produto-descricao').textContent = produto.descricao || '';

  // Determinar preço base
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

  // --- Criar elemento para exibir preço total dinâmico ---
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

  // Função para atualizar o preço total exibido no modal
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

  // Preencher Componentes (ingredientes inclusos)
  const listaComponentes = document.getElementById('modal-lista-componentes');
  listaComponentes.innerHTML = '';

  // --- Criar lista dinâmica que inclui componentes fixos + complementos selecionados ---
  const todosIngredientes = [];

  // Adiciona os componentes fixos (se existirem)
  if (produto.componentes && Array.isArray(produto.componentes) && produto.componentes.length > 0) {
    produto.componentes.forEach(comp => {
      todosIngredientes.push(comp);
    });
  }

  // Renderiza a lista inicial
  renderizarListaIngredientes();

  function renderizarListaIngredientes() {
    listaComponentes.innerHTML = '';
    const ingredientesParaExibir = [...todosIngredientes];

    // Adiciona os complementos SELECIONADOS à lista de ingredientes exibidos
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

  // Preencher Complementos
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

      // Define o estado inicial do checkbox com base nos complementos carregados
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

        // Salva o estado atual no objeto persistente
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

  // Exibir modal e overlay
  overlay.style.display = 'block';
  modal.style.display = 'block';
  overlay.offsetHeight;
  modal.offsetHeight;
  overlay.classList.add('ativo');
  modal.classList.add('ativo');

  // Atualiza preço total inicial
  atualizarPrecoTotalModal();
}

// Função para fechar o modal do produto (sem resetar)
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

// Função para fechar o modal e RESETAR os complementos (usada apenas no botão X)
function fecharModalProdutoComReset() {
  // Salva o ID do produto atual para resetar apenas ele
  if (produtoAtualModal && produtoAtualModal.id) {
    // Remove os complementos salvos deste produto
    delete complementosSalvosPorProduto[produtoAtualModal.id];
  }

  // Limpa o estado temporário
  complementosSelecionadosModal = {};

  // Desmarca visualmente todos os checkboxes
  const checkboxes = document.querySelectorAll('.modal-complemento-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });

  // Remove a classe 'selecionado' de todos os itens
  const itensComplemento = document.querySelectorAll('.modal-complemento-item');
  itensComplemento.forEach(item => {
    item.classList.remove('selecionado');
  });

  // Esconder o preço total dinâmico
  const precoTotalElement = document.getElementById('modal-produto-preco-total');
  if (precoTotalElement) {
    precoTotalElement.style.display = 'none';
  }

  // Fecha o modal
  fecharModalProduto();
}

// Adicionar ao carrinho com complementos
function adicionarCarrinho(produtoId, nome, precoBase, complementosSelecionados = []) {
  if (!lojaAberta()) {
    mostrarModal("Loja Fechada", "Pedidos só podem ser feitos entre 18:00 e 23:30");
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

// Função chamada pelo botão "Adicionar ao Carrinho" do modal
function adicionarProdutoDoModalAoCarrinho() {
  if (!produtoAtualModal) {
    console.error("Nenhum produto selecionado para adicionar ao carrinho via modal.");
    mostrarNotificacao("Erro: Produto não selecionado.");
    return;
  }

  // Determina o preço base
  let precoBase = produtoAtualModal.preco;
  if (produtoAtualModal.promocao && produtoAtualModal.promocao.ativa) {
    const dataFimPromo = new Date(produtoAtualModal.promocao.dataFim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataFimPromo >= hoje) {
      precoBase = produtoAtualModal.promocao.preco;
    }
  }

  // Converte o objeto de complementos selecionados em um array
  const complementosArray = Object.values(complementosSelecionadosModal);

  // Chama a função principal de adicionar ao carrinho
  adicionarCarrinho(produtoAtualModal.id, produtoAtualModal.nome, precoBase, complementosArray);

  // Após adicionar ao carrinho, RESETA os complementos salvos deste produto
  if (produtoAtualModal && produtoAtualModal.id) {
    delete complementosSalvosPorProduto[produtoAtualModal.id];
  }

  // Fecha o modal após adicionar
  fecharModalProduto();
  mostrarNotificacao("Item adicionado ao carrinho!");
}

// Remover item do carrinho
function removerItemCarrinho(index) {
  carrinho.splice(index, 1);
  renderizarCarrinhoModal();
  atualizarCarrinhoFlutuante();
  mostrarNotificacao("Item removido!");
}

// Atualizar carrinho flutuante
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

// Abrir modal do carrinho
function abrirCarrinho() {
  document.getElementById("carrinho-modal").classList.add("ativo");
  document.getElementById("modal-overlay").classList.add("ativo");
  renderizarCarrinhoModal();
}

// Fechar modal do carrinho
function fecharCarrinho() {
  document.getElementById("carrinho-modal").classList.remove("ativo");
  document.getElementById("modal-overlay").classList.remove("ativo");
}

// Renderizar carrinho no modal
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

    // Formatar complementos para exibição
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

// Mostrar telas
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");

  // Atualizar navegação
  document.querySelectorAll(".nav-button").forEach(btn => btn.classList.remove("active"));
  if (id === 'tela-cardapio') {
    document.getElementById("btn-cardapio").classList.add("active");
  } else if (id === 'tela-perfil') {
    document.getElementById("btn-perfil").classList.add("active");
  } else {
    document.getElementById("btn-pedidos").classList.add("active");
    atualizarPedidosCliente();
  }

  // Se for para pedidos, verificar se perfil está completo
  if (id === 'tela-pedido') {
    // --- MODIFICAÇÃO: Verificar número também ---
    if (!perfilCliente.nome || !perfilCliente.whatsapp || !perfilCliente.endereco || !perfilCliente.numero) {
      mostrarModal("Perfil incompleto", "Por favor, complete seu perfil antes de ver os pedidos.");
      mostrarTela('tela-perfil');
      return;
    }
  }
}

// Formatar mensagem para WhatsApp com complementos
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
  // --- MODIFICAÇÃO: Incluir o número na mensagem do pedido ---
  msg += ` Endereço: ${pedido.cliente.endereco}, ${pedido.cliente.numero} - ${pedido.cliente.bairro}\n`;
  // --- FIM DA MODIFICAÇÃO ---
  msg += ` Cidade: ${pedido.cliente.cidade}/${pedido.cliente.estado}\n`;
  msg += ` CEP: ${pedido.cliente.cep.substring(0,5)}-${pedido.cliente.cep.substring(5)}\n`;
  msg += `\n`;
  msg += `📋 *ITENS:*\n`;
  msg += `━━━━━━━━━━━━━━\n`;

  pedido.itens.forEach((item, index) => {
    msg += `${index + 1}. ${item.nome} - R$ ${item.preco.toFixed(2)}\n`;

    // Adicionar complementos
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

// Finalizar pedido
document.getElementById("btn-finalizar-modal").addEventListener("click", async () => {
  if (carrinho.length === 0) return;

  if (!lojaAberta()) {
    mostrarModal("Loja Fechada", "Pedidos só podem ser feitos entre 18:00 e 23:30");
    return;
  }

  // Verificar se perfil está completo
  // --- MODIFICAÇÃO: Verificar número também ---
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
      // --- MODIFICAÇÃO: Incluir 'numero' no objeto do pedido ---
      numero: perfilCliente.numero, // --- NOVA PROPRIEDADE ---
      // --- FIM DA MODIFICAÇÃO ---
      bairro: perfilCliente.bairro,
      cidade: perfilCliente.cidade,
      estado: perfilCliente.estado
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
    // Salvar pedido no Realtime Database
    const newPedidoRef = push(pedidosRef);
    await set(newPedidoRef, pedido);

    // Preparar mensagem para cópia manual
    const mensagemComanda = formatarComandaWhatsApp(pedido);

    // Mostrar modal com opção de copiar e enviar manualmente
    mostrarModalEnvioManual(mensagemComanda, pedido);

    // Limpar carrinho
    carrinho = [];
    atualizarCarrinhoFlutuante();
    renderizarCarrinhoModal();
    fecharCarrinho();

  } catch(e) {
    console.error("Erro:", e);
    mostrarModal("Erro", "Erro ao processar pedido");
  }
});

// Modal para envio manual - CENTRALIZADO
function mostrarModalEnvioManual(mensagem, pedido) {
  // Remover modais antigos
  const modaisAntigos = document.querySelectorAll('.modal-overlay-temp');
  modaisAntigos.forEach(modal => modal.remove());

  // Codificar a mensagem para URL
  const mensagemCodificada = encodeURIComponent(mensagem);
  const urlWhatsApp = `https://wa.me/ ${WHATSAPP_EMPRESA}?text=${mensagemCodificada}`;

  // Criar overlay
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

  // Criar conteúdo do modal
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
    <p style="color: #555; margin-bottom: 20px;">Pedido:</p>

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

// Função para copiar comanda
function copiarComanda() {
  const comandaTexto = document.getElementById('comanda-texto').innerText;
  navigator.clipboard.writeText(comandaTexto).then(() => {
    mostrarNotificacao("Comanda copiada! Cole no WhatsApp");
  }).catch(err => {
    console.error('Erro ao copiar: ', err);
    mostrarNotificacao("Erro ao copiar a comanda.");
  });
}

// Status da loja
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

// Atualizar pedidos do cliente
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

    // Ordenar por data (mais recente primeiro)
    pedidosArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    pedidosArray.forEach(p => {
      const li = document.createElement("li");
      li.className = "pedido-item";

      // Definir cor do status
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

// Funções auxiliares - CENTRALIZADAS
function mostrarModal(titulo, mensagem) {
  // Remover modais antigos
  const modaisAntigos = document.querySelectorAll('.modal-overlay-temp');
  modaisAntigos.forEach(modal => modal.remove());

  // Criar overlay
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

  // Criar conteúdo do modal
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-temp';
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 90%;
    width: 450px;
    text-align: center;
    position: relative;
    margin: auto;
    max-height: 90vh;
    overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <h3 style="margin-top: 0; color: #333; font-size: 1.5rem;">${titulo}</h3>
    <p style="color: #666; line-height: 1.6; margin: 20px 0;">${mensagem}</p>
    <button onclick="this.closest('.modal-overlay-temp').remove()"
            style="margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.3s;">
      Fechar
    </button>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

function mostrarNotificacao(mensagem) {
  // Remover notificações antigas
  const notificacoesAntigas = document.querySelectorAll('.notificacao-temp');
  notificacoesAntigas.forEach(notif => notif.remove());

  const notif = document.createElement('div');
  notif.className = 'notificacao-temp';
  notif.textContent = mensagem;
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ea1d2c;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 2000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    font-weight: 500;
    max-width: 300px;
  `;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.transform = 'translateX(0)';
  }, 100);

  setTimeout(() => {
    notif.style.transform = 'translateX(400px)';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
  }
