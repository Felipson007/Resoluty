import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Stack, TextField, Button, Grid, AppBar, Toolbar, Avatar } from '@mui/material';
import { Bar, Pie, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MonetizationOn, TrendingUp, TrendingDown, Percent, Assignment, Star, WaterDrop, QrCode2 } from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // <-- Adicionado para Pie Chart
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // <-- Adicionado para Pie Chart
  Title,
  Tooltip,
  Legend
);

const getMockData = () => ({
  indicadores: [
    { label: '% Meta Atingida', value: '29,88%' },
    { label: 'Meta', value: 'R$ 155.000,00' },
    { label: 'Realizado', value: 'R$ 46.321,06' },
    { label: 'Diferença', value: 'R$ -108.678,94' },
    { label: 'Total de acordo por funcionário', value: 'Felipe: 1, Matheus: 9' },
    { label: 'Total de acordo', value: '10' },
    { label: 'Avaliação Google', value: '4.8 ★' },
    { label: 'Média de Meses de Quitação', value: '6.2' },
    { label: '% Quitação', value: '82%' },
    { label: '% Quitação por funcionário', value: 'Felipe: 80%, Matheus: 85%' },
    { label: 'Média de meses de quitação por funcionário', value: 'Felipe: 5.8, Matheus: 6.5' },
    { label: '% Vazão da Carteira (Planilha 2)', value: '67%' },
  ],
  faturamentoData: {
    labels: ['Felipe', 'Matheus'],
    datasets: [
      {
        label: 'Faturamento',
        data: [9731.6, 36589.46],
        backgroundColor: '#d4e157',
      },
    ],
  },
  acordosData: {
    labels: ['Matheus', 'Felipe'],
    datasets: [
      {
        label: 'Nº de Acordos',
        data: [9, 1],
        backgroundColor: '#1976d2',
      },
    ],
  },
  peData: {
    labels: ['Felipe', 'Matheus'],
    datasets: [
      {
        label: 'P.E.',
        data: [5296.33, 22222.64],
        backgroundColor: '#1976d2',
      },
      {
        label: 'Adimplência',
        data: [3307.39, 4445.42],
        backgroundColor: '#26c6da',
      },
      {
        label: 'Antecipação de P.E.',
        data: [1127.88, 0],
        backgroundColor: '#ab47bc',
      },
      {
        label: 'Recuperação',
        data: [0, 2647.5],
        backgroundColor: '#8d6e63',
      },
    ],
  },
  grandeData: {
    labels: ['11', '4', '14', '7', '1', '10', '2', '8'],
    datasets: [
      {
        label: 'Matheus',
        data: [10579.52, 3142.5, 9076.05, 7433.46, 5307.56, 0, 0, 0],
        backgroundColor: '#ff9800',
      },
      {
        label: 'Felipe',
        data: [0, 6795.53, 0, 1138, 0, 842.31, 487.76, 180],
        backgroundColor: '#26c6da',
      },
    ],
  },
  quitacaoData: {
    labels: ['Felipe', 'Matheus'],
    datasets: [
      {
        label: '% Quitação',
        data: [80, 85],
        backgroundColor: ['#1976d2', '#ff9800'],
      },
    ],
  },
  mesesQuitacaoData: {
    labels: ['Felipe', 'Matheus'],
    datasets: [
      {
        label: 'Média de meses de quitação',
        data: [5.8, 6.5],
        backgroundColor: ['#1976d2', '#ff9800'],
      },
    ],
  },
  vazaoCarteiraData: {
    labels: ['% Vazão da Carteira'],
    datasets: [
      {
        label: 'Vazão',
        data: [67],
        backgroundColor: ['#ab47bc'],
      },
    ],
  },
});

const chartOptions = (title: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    title: { display: true, text: title },
    tooltip: { enabled: true },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function (tickValue: string | number) {
          if (typeof tickValue === 'number') {
            return tickValue >= 1000 ? `${(tickValue / 1000).toFixed(1)} mil` : tickValue;
          }
          return tickValue;
        },
      },
    },
  },
});

const kpiIcons = [
  <MonetizationOn fontSize="large" />, // Meta
  <TrendingUp fontSize="large" />,    // Realizado
  <TrendingDown fontSize="large" />,  // Diferença
  <Percent fontSize="large" />,       // % Meta
  <Assignment fontSize="large" />,    // Total de Acordos
  <Star fontSize="large" />,          // Avaliação Google
  <WaterDrop fontSize="large" />,     // % Vazão
];

// Paleta Resoluty
export const resolutyPalette = {
  background: '#0A1A2F', // Fundo geral
  sidebar: '#081B30',    // Sidebar/Menu
  text: '#FFFFFF',       // Texto principal
  textSecondary: '#B0BEC5', // Texto secundário
  border: '#1E3A8A',     // Borda de cards
  card: '#0F2944',       // Fundo dos cards/KPIs
  chartBg: '#132A45',    // Fundo dos gráficos
  kpiHit: '#22C55E',     // KPI atingido
  kpiMiss: '#EF4444',    // KPI não atingido
  shadow: 'rgba(0,0,0,0.3)',
  // Gráficos principais
  chartMain: ['#4ADE80', '#3B82F6', '#FBBF24', '#F97316', '#8B5CF6', '#FB7185'],
  // Quitação
  quitado: '#4ADE80',
  restante: '#EF4444',
  // P.E / Adimplência / Antecipação / Recuperação
  pe: '#3B82F6',
  adimplencia: '#4ADE80',
  antecipacao: '#FBBF24',
  recuperacao: '#FB7185',
  // Entradas diárias
  funcionarioA: '#60A5FA',
  funcionarioB: '#F97316',
  funcionarioC: '#8B5CF6',
  funcionarioD: '#F472B6',
  // Interações
  hoverSidebar: '#1E3A8A',
  activeSidebar: '#3B82F6',
  sucesso: '#4ADE80',
  alerta: '#FBBF24',
  erro: '#EF4444',
};

const kpiColors = [
  resolutyPalette.kpiHit, // Meta
  resolutyPalette.kpiHit,  // Realizado
  resolutyPalette.kpiMiss,   // Diferença
  resolutyPalette.alerta, // % Meta
  resolutyPalette.kpiHit,   // Total de Acordos
  '#FFD700',        // Avaliação Google (ouro)
  resolutyPalette.kpiHit,  // % Vazão
];

const kpiStyle = {
  p: 3,
  borderRadius: 3,
  background: '#222',
  color: '#fff',
  fontWeight: 700,
  textAlign: 'center',
  boxShadow: 4,
  minWidth: 180,
  minHeight: 90,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const darkPaper = {
  background: resolutyPalette.card,
  color: resolutyPalette.text,
  borderRadius: 3,
  boxShadow: 4,
  border: `1.5px solid ${resolutyPalette.border}`,
};

export const csBackgroundColor = resolutyPalette.background;

export default function CustomerSuccess() {
  const [periodoState, setPeriodoState] = useState({ inicio: '', fim: '' });
  const [dados, setDados] = useState(getMockData());
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    setDados(getMockData());
    const interval = setInterval(() => setDados(getMockData()), 10 * 60 * 1000);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, []);

  // KPIs principais
  const kpis = [
    { label: 'Meta', value: dados.indicadores[1].value },
    { label: 'Realizado', value: dados.indicadores[2].value },
    { label: 'Diferença', value: dados.indicadores[3].value },
    { label: '% Meta Atingida', value: dados.indicadores[0].value },
    { label: 'Total de Acordos', value: dados.indicadores[5].value },
    { label: 'Avaliação Google', value: dados.indicadores[6].value },
    { label: '% Vazão da Carteira', value: dados.indicadores[11].value },
  ];

  // Gráficos e dados para cada linha
  // Linha 2
  const faturamentoTipoData = dados.faturamentoData; // customize colors if needed
  const acordosData = dados.acordosData;
  // Linha 3
  const grandeData = dados.grandeData;
  const peData = dados.peData;
  // Linha 4
  const quitacaoData = dados.quitacaoData;
  const quitacaoPieData = {
    labels: ['Quitação Geral', 'Restante'],
    datasets: [{
      data: [parseFloat(dados.indicadores[8].value.replace('%','')), 100-parseFloat(dados.indicadores[8].value.replace('%',''))],
      backgroundColor: [resolutyPalette.quitado, resolutyPalette.restante],
    }],
  };
  const mesesQuitacaoData = dados.mesesQuitacaoData;
  // Linha 5
  const acordosRecentes = [
    { cliente: 'João', valor: 'R$ 2.000,00', data: '2024-07-01' },
    { cliente: 'Maria', valor: 'R$ 3.500,00', data: '2024-07-02' },
    { cliente: 'Carlos', valor: 'R$ 1.200,00', data: '2024-07-03' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: resolutyPalette.background, p: 0, overflow: 'auto' }}>
      {/* Header Superior */}
      <AppBar position="static" sx={{ background: resolutyPalette.sidebar, boxShadow: 3, zIndex: 1200, minHeight: 60 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  flexWrap: 'wrap', minHeight: 60 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: resolutyPalette.activeSidebar, width: 48, height: 48, fontWeight: 900 }}>R</Avatar>
            <Typography variant="h5" sx={{ fontWeight: 900, color: resolutyPalette.text, letterSpacing: 1 }}>DASHBOARD - CUSTOMER SUCCESS</Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Início"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={periodoState.inicio}
              onChange={e => setPeriodoState(s => ({ ...s, inicio: e.target.value }))}
              sx={{ input: { color: resolutyPalette.text }, label: { color: resolutyPalette.text }, minWidth: 120 }}
            />
            <TextField
              label="Fim"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={periodoState.fim}
              onChange={e => setPeriodoState(s => ({ ...s, fim: e.target.value }))}
              sx={{ input: { color: resolutyPalette.text }, label: { color: resolutyPalette.text }, minWidth: 120 }}
            />
            <Button variant="contained" sx={{ background: resolutyPalette.activeSidebar, color: resolutyPalette.text, fontWeight: 700, ':hover': { background: resolutyPalette.hoverSidebar } }}>Filtrar</Button>
          </Stack>
          <Box sx={{ minWidth: 180, textAlign: 'right' }}>
            <Typography variant="body2" sx={{ color: resolutyPalette.text, fontWeight: 700 }}>{now.toLocaleDateString()} {now.toLocaleTimeString()}</Typography>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Linha 1: KPIs */}
      <Box sx={{ width: '100%', background: resolutyPalette.sidebar, py: 3, px: 0, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
        {kpis.map((kpi, idx) => (
          <Paper key={kpi.label} sx={{ ...darkPaper, p: 3, minWidth: 200, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 32, borderLeft: `8px solid ${kpiColors[idx]}` }}>
            <Box sx={{ mb: 1, color: kpiColors[idx] }}>{kpiIcons[idx]}</Box>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 20 }}>{kpi.label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, fontSize: 36, color: kpiColors[idx] }}>{kpi.value}</Typography>
          </Paper>
        ))}
      </Box>
      {/* Linha 2: Faturamento e Acordos */}
      <Grid container spacing={3} sx={{ maxWidth: 1800, mx: 'auto', mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.sucesso, fontWeight: 700, mb: 2 }}>Faturamento por Funcionário e Tipo</Typography>
            <Bar data={faturamentoTipoData} options={{ ...chartOptions(''), plugins: { ...chartOptions('').plugins, legend: { display: true }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 16 } } }, scales: { y: { beginAtZero: true } } }} height={320} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.activeSidebar, fontWeight: 700, mb: 2 }}>Nº de Acordos por Funcionário</Typography>
            <Bar data={acordosData} options={{ ...chartOptions(''), plugins: { ...chartOptions('').plugins, legend: { display: false }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 16 } } }, scales: { y: { beginAtZero: true } } }} height={320} />
          </Paper>
        </Grid>
      </Grid>
      {/* Linha 3: Entradas Diárias e P.E/Adimplência */}
      <Grid container spacing={3} sx={{ maxWidth: 1800, mx: 'auto', mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.alerta, fontWeight: 700, mb: 2 }}>Entradas Diárias por Funcionário</Typography>
            <Bar data={grandeData} options={{ ...chartOptions(''), plugins: { ...chartOptions('').plugins, legend: { display: true }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 16 } } }, scales: { y: { beginAtZero: true } } }} height={320} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.funcionarioA, fontWeight: 700, mb: 2 }}>P.E / Adimplência / Antecipação / Recuperação</Typography>
            <Bar data={peData} options={{ ...chartOptions(''), plugins: { ...chartOptions('').plugins, legend: { display: true }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 16 } } }, scales: { y: { beginAtZero: true } } }} height={320} />
          </Paper>
        </Grid>
      </Grid>
      {/* Linha 4: Quitação e Indicadores */}
      <Grid container spacing={3} sx={{ maxWidth: 1800, mx: 'auto', mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.sucesso, fontWeight: 700, mb: 2 }}>Quitação por Funcionário</Typography>
            <Bar data={quitacaoData} options={{ ...chartOptions(''), plugins: { ...chartOptions('').plugins, legend: { display: false }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 16 } } }, scales: { y: { beginAtZero: true } } }} height={320} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.alerta, fontWeight: 700, mb: 2 }}>% Quitação Geral</Typography>
            <Pie data={quitacaoPieData} options={{ plugins: { legend: { display: true, labels: { color: resolutyPalette.text, font: { size: 18 } } }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 20 }, formatter: v => `${v}%` } } }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...darkPaper, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: resolutyPalette.activeSidebar, fontWeight: 700, mb: 2 }}>Média de Meses de Quitação por Funcionário</Typography>
            <Bar data={mesesQuitacaoData} options={{ ...chartOptions(''), plugins: { ...chartOptions('').plugins, legend: { display: false }, datalabels: { color: resolutyPalette.text, font: { weight: 'bold', size: 16 } } }, scales: { y: { beginAtZero: true } } }} height={320} />
          </Paper>
        </Grid>
      </Grid>
     
      {/* Footer */}
      <Box sx={{ width: '100%', background: resolutyPalette.background, py: 2, textAlign: 'center', color: resolutyPalette.text, fontWeight: 700, fontSize: 18 }}>
        Última atualização: {now.toLocaleString()}
      </Box>
    </Box>
  );
}
