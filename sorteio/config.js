// URL do Apps Script (termina em /exec).
window.SORTEIO_API = 'https://script.google.com/macros/s/AKfycbxdP15gEk2Nd7BVCQAiSs8XTwae439df4SrwEm-woIvGMIz5T6RmCJDJzlZQJeRIMR0qg/exec';
// Horários valem para o dia de hoje (horário de Brasília), todo dia.
window.SORTEIO_DIA = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
window.SORTEIO_HORA = window.SORTEIO_DIA + 'T19:00:00-03:00'; // sorteio e fim dos cadastros
window.X1_HORA = window.SORTEIO_DIA + 'T18:00:00-03:00';      // X1 e fim das inscrições
