const AMBIENTES = {
  AUDITORIO: 'Auditório',
  CENTRO_OPERACOES: 'Centro de Operações',
  SALA_CRISE: 'Sala de Crise'
};

const PERIODOS = {
  INTEGRAL: { label: 'Integral (08h às 18h)' },
  MANHA: { label: 'Manhã (08h às 12h)' },
  TARDE: { label: 'Tarde (13h às 17h)' },
  NOITE: { label: 'Noite (18h às 21h)' }
};

module.exports = {
  AMBIENTES,
  PERIODOS,
  AMBIENTE_PADRAO: 'AUDITORIO'
};
