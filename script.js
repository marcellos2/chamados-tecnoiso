document.addEventListener('DOMContentLoaded', () => {
  // Inicializa o histórico se não existir
  if (!localStorage.getItem('taskHistory')) {
    localStorage.setItem('taskHistory', JSON.stringify([]));
  }
  if (checkCooldown()) {
    document.body.classList.add('cooldown-active');
    updateCooldownTimer();
  }
  // Inicializa o slider CAPTCHA
  initSliderCaptcha();
  // Inicializa Feather Icons
  feather.replace();
  // Adicione no DOMContentLoaded, após feather.replace();
  document.getElementById('telefone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0) {
      value = '(' + value.substring(0, 2) + ') ' + value.substring(2, 7) + '-' + value.substring(7, 11);
    }
    e.target.value = value.substring(0, 15);
  });
  // No final do DOMContentLoaded, adicione:
  document.getElementById('newTicketBtn').addEventListener('click', () => {
    document.body.classList.remove('editing-mode');
    resetForm();
  });

  // Modifique a função resetForm para remover a classe de edição:
  function resetForm() {
    document.body.classList.remove('editing-mode');
    ticketForm.reset();
    taskIdInput.value = '';
    const submitBtn = document.querySelector('#ticketForm button[type="submit"]');
    submitBtn.innerHTML = '<i data-feather="send"></i> Enviar Chamado';

    // Restaura o título original
    const formTitle = document.getElementById('formTitle');
    formTitle.innerHTML = '<i data-feather="plus-circle"></i> Abrir Novo Chamado';

    // Limpa a prévia de arquivos
    document.getElementById('fileListPreview').innerHTML = '';

    // Reseta o CAPTCHA
    captchaVerified = false;
    document.querySelector('.slider-thumb').style.left = '0';
    document.querySelector('.slider-progress').style.width = '0';
    document.querySelector('.slider-thumb').style.backgroundColor = 'var(--primary)';
    document.querySelector('.slider-target').style.display = 'block';
    document.querySelector('.slider-success').style.display = 'none';
    document.getElementById('captchaContainer').style.display = 'none';

    feather.replace();
  }
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('fade-out');
      setTimeout(() => preloader.remove(), 500);
    }
  }, 2000); // agora espera 2 segundos

  // Configuração do Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyCuw1A_5KO1IWEv2OaIDqMoLHF56Sb2j-w",
    authDomain: "tecnoisotarefas.firebaseapp.com",
    databaseURL: "https://tecnoisotarefas-default-rtdb.firebaseio.com/",
    projectId: "tecnoisotarefas",
    storageBucket: "tecnoisotarefas.appspot.com",
    messagingSenderId: "711312621600",
    appId: "1:711312621600:web:22ed8ff5dae7db79f1fc45"
  };

  // Inicializa o Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database(app);
  // Inicializa o Firebase Storage
  const storage = firebase.storage(app);

  // Elementos da UI
  const historyModal = document.getElementById('historyModal');
  const confirmationModal = document.getElementById('confirmationModal');
  const historyBtn = document.getElementById('historyBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const searchBtn = document.getElementById('searchBtn');
  const backBtn = document.getElementById('backBtn');
  const editBtn = document.getElementById('editBtn');
  const ticketForm = document.getElementById('ticketForm');
  const modalButton = document.getElementById('modalButton');
  const taskIdInput = document.getElementById('taskId');
  const fileInput = document.getElementById('arquivos'); // Novo input
  const fileListPreview = document.getElementById('fileListPreview'); // Novo preview

  // Handler para prévia de arquivos
  fileInput.addEventListener('change', (e) => {
    fileListPreview.innerHTML = ''; // Limpa a lista anterior
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileElement = document.createElement('span');
      fileElement.innerHTML = `
        <i data-feather="file"></i> ${file.name}
        <span class="remove-file" data-filename="${file.name}" style="cursor:pointer; margin-left: 5px;">×</span>
      `;
      fileListPreview.appendChild(fileElement);
    }
    feather.replace(); // Re-renderiza os ícones

    // Adiciona listener para remover arquivos
    document.querySelectorAll('.remove-file').forEach(removeBtn => {
      removeBtn.addEventListener('click', (event) => {
        const filenameToRemove = event.target.dataset.filename;
        const dt = new DataTransfer();
        const currentFiles = Array.from(fileInput.files);

        currentFiles.forEach(file => {
          if (file.name !== filenameToRemove) {
            dt.items.add(file);
          }
        });
        fileInput.files = dt.files; // Atualiza a lista de arquivos do input
        event.target.closest('span').remove(); // Remove o elemento da prévia
      });
    });
  });


  // FAQ Accordion
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const answer = question.nextElementSibling;
      const icon = question.querySelector('i');

      answer.classList.toggle('open');

      if (answer.classList.contains('open')) {
        icon.setAttribute('data-feather', 'chevron-up');
      } else {
        icon.setAttribute('data-feather', 'chevron-down');
      }

      feather.replace();
    });
  });
  // Função para mostrar a posição na fila
  async function showQueuePosition(taskId, task) {
    try {
      // Verifica se o objeto task existe e tem status
      if (!task || !task.status) {
        return '<div class="status-error">Informações do chamado não disponíveis</div>';
      }

      // Primeiro verifica os status especiais
      if (task.status === "Concluído") {
        return `
          <div class="status-container completed">
            <div class="status-icon">✅</div>
            <h4>Chamado Concluído</h4>
            <p>Seu problema foi resolvido em ${new Date().toLocaleDateString()}</p>
            <div class="progress-animation">
              <div class="check-animation"></div>
            </div>
          </div>
        `;
      }

      if (task.status === "Em andamento") {
        return `
          <div class="status-container in-progress">
            <div class="status-icon">🔧</div>
            <h4>Chamado em andamento</h4>
            <p>Nosso técnico está trabalhando na sua solicitação</p>
            <div class="progress-animation">
              <div class="gear-animation"></div>
            </div>
          </div>
        `;
      }

      // Para status Pendente (ou qualquer outro status não tratado acima)
      const snapshot = await database.ref('tasks').orderByChild('status').equalTo('Pendente').once('value');
      let tasks = [];

      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const taskData = childSnapshot.val();
          if (taskData && taskData.status === "Pendente") {
            tasks.push({
              id: childSnapshot.key,
              priority: taskData.priority || 'Baixa',
              dueDate: taskData.dueDate || new Date().toISOString(),
              createdDate: taskData.createdDate || new Date().toISOString(),
              ...taskData
            });
          }
        });
      }

      // Garante que o task atual está na lista se for Pendente
      if (task.status === "Pendente" && !tasks.some(t => t.id === taskId)) {
        tasks.push({
          id: taskId,
          priority: task.priority || 'Baixa',
          dueDate: task.dueDate || new Date().toISOString(),
          createdDate: task.createdDate || new Date().toISOString(),
          ...task
        });
      }

      // Ordenação apenas se houver tarefas
      if (tasks.length > 0) {
        tasks.sort((a, b) => {
          const priorityOrder = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(a.dueDate) - new Date(b.dueDate);
        });

        const position = tasks.findIndex(t => t.id === taskId);
        const totalInQueue = tasks.length;

        if (position >= 0) {
          const progress = Math.min(100, ((position + 1) / totalInQueue) * 100);

          return `
            <div class="queue-container">
              <h4><i data-feather="clock"></i> Posição na Fila: ${position + 1}º de ${totalInQueue}</h4>
              <div class="queue-progress-container">
                <div class="queue-track"></div>
                <div class="queue-progress" style="width: ${progress}%"></div>
                <div class="queue-walker" style="left: ${progress}%">
                  <div class="walker-icon">👤</div>
                </div>
              </div>
              <div class="queue-message">
                <i data-feather="info"></i> ${getQueueMessage(position + 1, totalInQueue)}
              </div>
            </div>
          `;
        }
      }

      // Fallback para qualquer situação não prevista
      return `
        <div class="status-container">
          <h4><i data-feather="help-circle"></i> Status: ${task.status}</h4>
          <p>Seu chamado está registrado em nosso sistema.</p>
        </div>
      `;

    } catch (error) {
      console.error('Erro ao verificar posição:', error);
      return `
        <div class="status-error">
          <i data-feather="alert-triangle"></i> Não foi possível verificar o status do chamado.
        </div>
      `;
    }
  }
  // Mantenha esta função auxiliar que já existia
  function getQueueMessage(position, total) {
    if (position === 1) {
      return "Seu chamado é o próximo a ser atendido!";
    } else if (position <= 3) {
      return "Seu chamado está entre os primeiros da fila e será atendido em breve.";
    } else if (position <= total * 0.5) {
      return "Seu chamado está na primeira metade da fila.";
    } else {
      return "Seu chamado está na segunda metade da fila. O tempo de espera pode ser maior.";
    }
  }
  function checkCooldown() {
    const lastSubmission = localStorage.getItem('lastTicketSubmission');
    if (!lastSubmission) return false;

    const now = new Date();
    const lastDate = new Date(parseInt(lastSubmission));
    const diffInMinutes = (now - lastDate) / (1000 * 60);

    return diffInMinutes < 10;
  }
  // Variável para armazenar o estado do CAPTCHA
  let captchaVerified = false;

  // Inicializa o slider CAPTCHA
  function initSliderCaptcha() {
    const thumb = document.querySelector('.slider-thumb');
    const track = document.querySelector('.slider-track');
    const progress = document.querySelector('.slider-progress');
    const target = document.querySelector('.slider-target');
    const success = document.querySelector('.slider-success');

    let isDragging = false;
    let startX = 0;
    let thumbX = 0;
    const targetPosition = track.offsetWidth * 0.8; // 80% do caminho
    const threshold = 15; // Margem de erro em pixels

    // Configurações para evitar comportamentos indesejados
    thumb.style.touchAction = 'none';
    thumb.style.userSelect = 'none';

    thumb.addEventListener('mousedown', startDrag);
    thumb.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      isDragging = true;
      startX = e.clientX || e.touches[0].clientX;
      thumbX = thumb.offsetLeft;

      // Adiciona listeners de movimento e fim
      document.addEventListener('mousemove', drag);
      document.addEventListener('touchmove', drag, { passive: false });
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('touchend', endDrag);

      e.preventDefault();
      e.stopPropagation();
    }

    function drag(e) {
      if (!isDragging) return;

      const clientX = e.clientX || e.touches[0].clientX;
      const deltaX = clientX - startX;
      let newX = thumbX + deltaX;

      // Limita o movimento dentro da track
      newX = Math.max(0, Math.min(newX, track.offsetWidth));

      thumb.style.left = newX + 'px';
      progress.style.width = newX + 'px';

      e.preventDefault();
      e.stopPropagation();
    }

    function endDrag(e) {
      if (!isDragging) return;

      // Obtém a posição final absoluta do thumb
      const thumbRect = thumb.getBoundingClientRect();
      const thumbCenter = thumbRect.left + thumbRect.width / 2;
      const targetRect = target.getBoundingClientRect();
      const targetCenter = targetRect.left + targetRect.width / 2;

      // Calcula a distância entre os centros
      const distance = Math.abs(thumbCenter - targetCenter);

      // Só completa se o centro do thumb estiver próximo do centro do alvo
      if (distance <= threshold) {
        completeCaptcha();
      } else {
        resetSlider();
      }

      // Remove os listeners temporários
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchend', endDrag);

      isDragging = false;
      e.preventDefault();
      e.stopPropagation();
    }

    function completeCaptcha() {
      captchaVerified = true;
      success.style.display = 'block';
      thumb.style.backgroundColor = '#4CAF50';
      thumb.style.left = targetPosition + 'px';
      progress.style.width = targetPosition + 'px';
      target.style.display = 'none';
      feather.replace();

      // Remove todos os listeners
      thumb.removeEventListener('mousedown', startDrag);
      thumb.removeEventListener('touchstart', startDrag);
    }

    function resetSlider() {
      // Animação suave de volta ao início
      thumb.style.transition = 'left 0.3s ease';
      progress.style.transition = 'width 0.3s ease';

      thumb.style.left = '0';
      progress.style.width = '0';

      // Remove a transição após a animação
      setTimeout(() => {
        thumb.style.transition = '';
        progress.style.transition = '';
      }, 300);
    }
  }
  // Atualiza o cronômetro
  function updateCooldownTimer() {
    const lastSubmission = localStorage.getItem('lastTicketSubmission');
    if (!lastSubmission) return;

    const now = new Date();
    const lastDate = new Date(parseInt(lastSubmission));
    const elapsedMinutes = (now - lastDate) / (1000 * 60);
    const remainingMinutes = Math.max(0, 10 - elapsedMinutes);

    if (remainingMinutes <= 0) {
      document.getElementById('cooldownMessage').style.display = 'none';
      document.body.classList.remove('cooldown-active');
      localStorage.removeItem('lastTicketSubmission');
      return;
    }

    const minutes = Math.floor(remainingMinutes);
    const seconds = Math.floor((remainingMinutes - minutes) * 60);
    document.getElementById('cooldownTimer').textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    setTimeout(updateCooldownTimer, 1000);
  }
  // Mostrar modal de confirmação
  function showModal(title, message, id = null) {
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    modalTitle.textContent = title;

    if (id) {
      modalMessage.innerHTML = `${message}<br><br><strong>ID do Chamado:</strong> ${id}`;
    } else {
      modalMessage.textContent = message;
    }

    confirmationModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      modalButton.focus();
    }, 100);
  }

  // Fechar modal de confirmação
  function closeModal() {
    confirmationModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Event Listeners
  modalButton.addEventListener('click', closeModal);
  historyBtn.addEventListener('click', openHistoryModal);
  closeHistoryBtn.addEventListener('click', closeHistoryModal);
  searchBtn.addEventListener('click', searchTaskById);
  backBtn.addEventListener('click', showTaskList);
  editBtn.addEventListener('click', prepareEdit);
  ticketForm.addEventListener('submit', handleFormSubmit);

  // Fechar modais ao clicar fora
  [historyModal, confirmationModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Buscar por Enter
  document.getElementById('searchId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchTaskById();
    }
  });

  // Abrir modal de histórico
  function openHistoryModal() {
    console.log('Abrindo modal de histórico'); // Debug
    historyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    showTaskList();

    // Configura listeners para atualização em tempo real
    const history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    history.forEach(task => {
      if (task && task.id) {
        const listItem = document.querySelector(`.task-item[data-id="${task.id}"]`);
        if (listItem) {
          setupTaskListener(task.id, listItem);
        }
      }
    });
  }
  function showTaskList() {
    document.getElementById('localHistory').style.display = 'block';
    document.getElementById('taskDetails').style.display = 'none';
    renderHistory(); // Re-renderiza a lista para garantir que está atualizada
  }
  function closeHistoryModal() {
    const history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    history.forEach(task => {
      if (task && task.id) {
        database.ref('tasks/' + task.id).off('value');
      }
    });

    historyModal.classList.remove('active');
    document.body.style.overflow = '';
    showTaskList();
  }
  // Manipulador do formulário
  async function handleFormSubmit(e) {
    e.preventDefault();

    // Verifica cooldown
    if (checkCooldown()) {
      document.body.classList.add('cooldown-active');
      updateCooldownTimer();
      showModal('Atenção', 'Você só pode abrir um novo chamado a cada 10 minutos. Por favor, aguarde o tempo restante.');
      return;
    }

    // Verifica se é uma edição ou novo chamado
    const taskId = taskIdInput.value;
    if (taskId) {
      // Atualiza um chamado existente
      await updateTicket(taskId);
    } else {
      // Para novos chamados, verifica o CAPTCHA
      if (!captchaVerified) {
        document.getElementById('captchaContainer').style.display = 'block';
        // Rola até o CAPTCHA
        document.getElementById('captchaContainer').scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        return; // Impede o envio até a verificação
      }
      // Se CAPTCHA já foi verificado, envia o formulário
      await createNewTicket();
    }
  }

  // Criar novo chamado
  async function createNewTicket() {
    const nome = document.getElementById('nome').value.trim();
    const empresa = document.getElementById('empresa').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const prazo = document.getElementById('prazo').value;
    const criticidade = document.getElementById('criticidade').value;
    const files = fileInput.files; // Pega os arquivos selecionados

    // Validação dos campos obrigatórios
    if (!nome || !empresa || !descricao || !prazo || !criticidade) {
      showModal('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validação de e-mail ou telefone
    if (!email && !telefone) {
      showModal('Atenção', 'Por favor, preencha pelo menos um dos campos: e-mail ou telefone.');
      return;
    }

    const taskId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    const novaTarefa = {
      id: taskId,
      title: `${nome} | ${empresa} | ${email ? email + ' ' : ''}${telefone ? telefone : ''}`.trim(),
      description: descricao,
      responsible: document.getElementById('responsavel').value,
      dueDate: prazo,
      priority: criticidade,
      status: "Pendente",
      category: "Simples", // Pode ser ajustado
      createdDate: new Date().toISOString(),
      nome: nome,
      empresa: empresa,
      email: email,
      telefone: telefone,
      attachments: [] // Array para armazenar os links dos anexos
    };

    // ----- LÓGICA DE UPLOAD DE ARQUIVOS (Firebase Storage) -----
    const uploadPromises = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = storage.ref(`attachments/${taskId}/${file.name}`);
      const uploadTask = storageRef.put(file);

      uploadPromises.push(
        uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
          .then(downloadURL => {
            novaTarefa.attachments.push({ name: file.name, url: downloadURL });
          })
          .catch(error => {
            console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
            throw error; // Propaga o erro para interromper o processo
          })
      );
    }

    try {
      await Promise.all(uploadPromises); // Aguarda todos os uploads terminarem

      // Agora que os uploads estão completos (ou falharam), salva a tarefa no DB
      await database.ref('tasks/' + taskId).set(novaTarefa);
      localStorage.setItem('lastTicketSubmission', Date.now().toString());
      showModal('Sucesso', 'Chamado enviado com sucesso!', taskId);
      resetForm();
      saveToHistory(novaTarefa);

    } catch (error) {
      showModal('Erro', 'Ocorreu um erro ao enviar o chamado ou ao processar os anexos. Por favor, tente novamente.');
      console.error("Erro geral no envio do chamado:", error);
    }
  }

  // Atualizar chamado existente
  async function updateTicket(taskId) {
    const nome = document.getElementById('nome').value.trim();
    const empresa = document.getElementById('empresa').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const prazo = document.getElementById('prazo').value;
    const criticidade = document.getElementById('criticidade').value;
    const files = fileInput.files; // Novos arquivos para adicionar

    if (!nome || !empresa || !descricao || !prazo || !criticidade) {
      showModal('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!email && !telefone) {
      showModal('Atenção', 'Por favor, preencha pelo menos um dos campos: e-mail ou telefone.');
      return;
    }

    const updatedTaskData = {
      title: `${nome} | ${empresa} | ${email ? email + ' ' : ''}${telefone ? telefone : ''}`.trim(),
      description: descricao,
      dueDate: prazo,
      priority: criticidade,
      nome: nome,
      empresa: empresa,
      email: email,
      telefone: telefone,
      status: "Pendente" // Resetar status ao editar, se necessário
    };

    try {
      // Lógica de upload para novos arquivos anexados na edição
      const uploadPromises = [];
      if (files.length > 0) {
        updatedTaskData.attachments = updatedTaskData.attachments || []; // Garante que o array existe
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const storageRef = storage.ref(`attachments/${taskId}/${file.name}`);
          const uploadTask = storageRef.put(file);

          uploadPromises.push(
            uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
              .then(downloadURL => {
                // Verifica se o arquivo já não está na lista antes de adicionar
                if (!updatedTaskData.attachments.some(att => att.name === file.name)) {
                  updatedTaskData.attachments.push({ name: file.name, url: downloadURL });
                }
              })
              .catch(error => {
                console.error(`Erro ao fazer upload do arquivo ${file.name} durante a edição:`, error);
                throw error;
              })
          );
        }
        await Promise.all(uploadPromises);
      }

      // Atualiza os dados no Firebase Realtime Database
      await database.ref('tasks/' + taskId).update(updatedTaskData);

      showModal('Sucesso', 'Chamado atualizado com sucesso!', taskId);
      resetForm();

      // Atualiza o histórico local com os novos dados
      let history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
      const index = history.findIndex(t => t.id === taskId);
      if (index !== -1) {
        history[index] = { ...history[index], ...updatedTaskData };
        localStorage.setItem('taskHistory', JSON.stringify(history));
      }
    } catch (error) {
      showModal('Erro', 'Ocorreu um erro ao atualizar o chamado ou ao processar os anexos.');
      console.error("Erro na atualização do chamado:", error);
    }
  }

  // Resetar formulário
  function resetForm() {
    ticketForm.reset();
    taskIdInput.value = '';
    const submitBtn = document.querySelector('#ticketForm button[type="submit"]');
    submitBtn.innerHTML = '<i data-feather="send"></i> Enviar Chamado';

    // Restaura o título original
    const formTitle = document.getElementById('formTitle');
    formTitle.innerHTML = '<i data-feather="plus-circle"></i> Abrir Novo Chamado';

    // Limpa a prévia de arquivos
    document.getElementById('fileListPreview').innerHTML = '';

    // Reseta o CAPTCHA
    captchaVerified = false;
    document.querySelector('.slider-thumb').style.left = '0';
    document.querySelector('.slider-progress').style.width = '0';
    document.querySelector('.slider-thumb').style.backgroundColor = 'var(--primary)';
    document.querySelector('.slider-target').style.display = 'block';
    document.querySelector('.slider-success').style.display = 'none';
    document.getElementById('captchaContainer').style.display = 'none';

    feather.replace();
  }

  // Salvar no histórico local
  function saveToHistory(task) {
    let history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    history = history.filter(t => t.id !== task.id); // Remove duplicatas se houver
    history.unshift(task); // Adiciona no início
    if (history.length > 10) history = history.slice(0, 10); // Mantém apenas os 10 mais recentes
    localStorage.setItem('taskHistory', JSON.stringify(history));
  }

  // Renderizar histórico
  function renderHistory() {
    const history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    const tasksList = document.getElementById('tasksList');

    tasksList.innerHTML = history.length === 0
      ? '<p style="padding: 1rem; text-align: center;">Nenhum chamado recente encontrado.</p>'
      : history.map(task => `
        <div class="task-item" data-id="${task.id}">
          <h4>${task.nome || task.title.split('|')[0].trim()}</h4>
          <p><strong>ID:</strong> ${task.id}</p>
          <p class="task-status"><strong>Status:</strong> ${task.status || 'Pendente'}</p>
          <p><strong>Data:</strong> ${new Date(task.createdDate).toLocaleDateString()}</p>
        </div>
      `).join('');

    // Adiciona event listeners aos itens
    document.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.task-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        showTaskDetails(item.dataset.id);
      });

      // Configura listener em tempo real para cada tarefa
      const taskId = item.dataset.id;
      setupTaskListener(taskId, item);
    });
  }
  function setupTaskListener(taskId, listItem) {
    // Configura um listener em tempo real para esta tarefa
    database.ref('tasks/' + taskId).on('value', (snapshot) => {
      const task = snapshot.val();
      if (task) {
        // Atualiza o status no item da lista
        const statusElement = listItem.querySelector('.task-status');
        if (statusElement) {
          statusElement.innerHTML = `<strong>Status:</strong> ${task.status || 'Pendente'}`;

          // Atualiza também no histórico local
          let history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
          const index = history.findIndex(t => t.id === taskId);
          if (index !== -1) {
            history[index].status = task.status;
            localStorage.setItem('taskHistory', JSON.stringify(history));
          }
        }

        // Se o item estiver selecionado (mostrando detalhes), atualiza também a visualização detalhada
        if (listItem.classList.contains('selected')) {
          showTaskDetails(taskId, task);
        }
      }
    });
  }
  async function showTaskDetails(taskId, task = null) {
    const localHistory = document.getElementById('localHistory');
    const taskDetails = document.getElementById('taskDetails');
    const taskInfo = document.getElementById('taskInfo');

    if (!task) {
      // Busca no Firebase se o task não foi fornecido
      const snapshot = await database.ref('tasks/' + taskId).once('value');
      task = snapshot.val();
    }

    if (task) {
      // Exibe os detalhes do chamado
      await displayTaskInfo(task);

      // Mostra a seção de detalhes e esconde a lista
      localHistory.style.display = 'none';
      taskDetails.style.display = 'block';
    } else {
      showModal('Erro', 'Chamado não encontrado.');
    }
  }
  // Buscar tarefa por ID
  function searchTaskById() {
    const taskId = document.getElementById('searchId').value.trim();

    if (!taskId) {
      showModal('Atenção', 'Por favor, informe o ID do chamado.');
      return;
    }

    // Primeiro verifica no histórico local
    const history = JSON.parse(localStorage.getItem('taskHistory') || '[]');
    const localTask = history.find(task => task.id === taskId);

    if (localTask) {
      showTaskDetails(taskId, localTask);
      return;
    }

    // Se não encontrou local, busca no Firebase
    database.ref('tasks/' + taskId).once('value')
      .then(snapshot => {
        const task = snapshot.val();
        if (task) {
          showTaskDetails(taskId, task);
          saveToHistory(task);
        } else {
          showModal('Não encontrado', 'Nenhum chamado encontrado com este ID.');
        }
      })
      .catch(error => {
        showModal('Erro', 'Ocorreu um erro ao buscar o chamado: ' + error.message);
      });
  }

  // Mostrar detalhes da tarefa
  async function displayTaskInfo(task) {
    const queuePositionHTML = await showQueuePosition(task.id, task);

    const taskInfo = document.getElementById('taskInfo');
    taskInfo.innerHTML = `
      <div class="task-details">
        <h4>Detalhes do Chamado #${task.id}</h4>
        <p><strong>Nome</strong> ${task.nome || task.title.split('|')[0].trim()}</p>
        <p><strong>Empresa</strong> ${task.empresa || task.title.split('|')[1].trim()}</p>
        ${task.email ? `<p><strong>E-mail</strong> ${task.email}</p>` : ''}
        ${task.telefone ? `<p><strong>Telefone</strong> ${task.telefone}</p>` : ''}
        <p><strong>Descrição</strong> ${task.description}</p>
        <p><strong>Criticidade</strong> <span class="priority-badge ${task.priority.toLowerCase()}">${task.priority}</span></p>
        <p><strong>Prazo</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
        <p><strong>Status</strong> <span class="status-badge ${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span></p>
        <p><strong>Criado em</strong> ${new Date(task.createdDate).toLocaleString()}</p>
        ${task.attachments && task.attachments.length > 0 ? `
          <p><strong>Anexos</strong>
            ${task.attachments.map(att => `
              <a href="${att.url}" target="_blank" title="Abrir ${att.name}" style="color: var(--primary); text-decoration: underline; margin-right: 0.5rem;">
                ${att.name}
              </a>
            `).join('')}
          </p>
        ` : ''}
      </div>
      ${queuePositionHTML}
    `;

    feather.replace();
  }
  // Preparar edição
  function prepareEdit() {
    const taskInfo = document.getElementById('taskInfo');

    // Debug: Verifica se encontrou o elemento taskInfo
    if (!taskInfo) {
      console.error('Elemento taskInfo não encontrado');
      showModal('Erro', 'Elemento de informações não encontrado.');
      return;
    }

    // Debug: Mostra todo o conteúdo para análise
    console.log('Conteúdo completo do taskInfo:', taskInfo.innerHTML);

    // Método 1: Procura pelo padrão do ID no texto (mais robusto)
    const fullText = taskInfo.textContent;
    const idMatch = fullText.match(/#(\w+)/);

    if (idMatch && idMatch[1]) {
      const taskId = idMatch[1];
      console.log('ID encontrado pelo método 1:', taskId);
      loadTaskForEditing(taskId);
      return;
    }

    // Método 2: Procura no cabeçalho (alternativo)
    const heading = taskInfo.querySelector('h4');
    if (heading) {
      const headingText = heading.textContent.trim();
      const taskId = headingText.startsWith('#') ? headingText.substring(1) : headingText;
      console.log('ID encontrado pelo método 2:', taskId);
      loadTaskForEditing(taskId);
      return;
    }

    // Se nenhum método funcionou
    console.error('Nenhum método encontrou o ID');
    showModal('Erro', 'Não foi possível identificar o ID do chamado. Consulte o console para detalhes.');
  }

  // Função auxiliar para carregar os dados (mantida igual à anterior)
  function loadTaskForEditing(taskId) {
    database.ref('tasks/' + taskId).once('value')
      .then(snapshot => {
        const task = snapshot.val();

        if (task) {
          // Adiciona classe ao body para indicar modo de edição
          document.body.classList.add('editing-mode');

          // Preenche todos os campos do formulário...
          document.getElementById('nome').value = task.nome || '';
          document.getElementById('empresa').value = task.empresa || '';
          document.getElementById('email').value = task.email || '';
          document.getElementById('telefone').value = task.telefone || '';
          document.getElementById('descricao').value = task.description || '';
          document.getElementById('prazo').value = task.dueDate || '';
          document.getElementById('criticidade').value = task.priority || 'Baixa';
          document.getElementById('taskId').value = taskId;

          // Atualiza a interface
          document.getElementById('formTitle').innerHTML = '<i data-feather="edit"></i> Editar Chamado';
          document.querySelector('#ticketForm button[type="submit"]').innerHTML = '<i data-feather="save"></i> Atualizar Chamado';
          feather.replace();

          closeHistoryModal();
          setTimeout(() => {
            document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          showModal('Erro', 'Chamado não encontrado no banco de dados.');
        }
      })
      .catch(error => {
        console.error('Erro Firebase:', error);
        showModal('Erro', 'Falha ao carregar dados do chamado.');
      });
  }
});