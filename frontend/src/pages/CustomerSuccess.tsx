import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Stack, TextField, Button, Grid } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Pie } from 'react-chartjs-2';
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

export default function CustomerSuccess() {
  const [periodoState, setPeriodoState] = useState({ inicio: '', fim: '' });
  const [dados, setDados] = useState(getMockData());

  useEffect(() => {
    setDados(getMockData()); // Atualiza ao carregar
    const interval = setInterval(() => {
      setDados(getMockData()); // Atualiza a cada 10 minutos
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Selecionar apenas os principais indicadores para a coluna lateral
  const indicadoresPrincipais = [
    { label: 'Meta', value: dados.indicadores[1].value },
    { label: 'Realizado', value: dados.indicadores[2].value },
    { label: 'Diferença', value: dados.indicadores[3].value },
    { label: '% da Meta', value: dados.indicadores[0].value },
  ];

  const indicadoresQuitacao = [
    { label: 'Média de Meses de Quitação', value: dados.indicadores[7].value },
    { label: '% Quitação', value: dados.indicadores[8].value },
    { label: '% Quitação por funcionário', value: dados.indicadores[9].value },
    { label: 'Média de meses de quitação por funcionário', value: dados.indicadores[10].value },
  ];

  // Dados para o gráfico de pizza de quitação
  const quitacaoPieData = {
    labels: [
      'Média de Meses de Quitação',
      '% Quitação',
      '% Quitação por funcionário',
      'Média de meses de quitação por funcionário',
    ],
    datasets: [
      {
        data: [
          parseFloat(dados.indicadores[7].value.replace(',', '.')), // Média de Meses de Quitação
          parseFloat(dados.indicadores[8].value.replace('%', '').replace(',', '.')), // % Quitação
          // Para % Quitação por funcionário, pegar média dos valores
          (() => {
            const arr = dados.indicadores[9].value.match(/\d+/g);
            if (!arr) return 0;
            return arr.map(Number).reduce((a, b) => a + b, 0) / arr.length;
          })(),
          // Para Média de meses de quitação por funcionário, pegar média dos valores
          (() => {
            const arr = dados.indicadores[10].value.match(/\d+\.?\d*/g);
            if (!arr) return 0;
            return arr.map(Number).reduce((a, b) => a + b, 0) / arr.length;
          })(),
        ],
        backgroundColor: ['#1976d2', '#ff9800', '#43a047', '#ab47bc'],
      },
    ],
  };

  // Dados para gráfico de barras de quitação por funcionário
  const quitacaoBarData = {
    labels: ['Felipe', 'Matheus'],
    datasets: [
      {
        label: '% Quitação',
        data: [80, 85], // mockados, ideal pegar dos dados
        backgroundColor: '#1976d2',
      },
      {
        label: 'Média de meses de quitação',
        data: [5.8, 6.5], // mockados, ideal pegar dos dados
        backgroundColor: '#ff9800',
      },
    ],
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#fff', p: 3, overflow: 'auto' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* Coluna principal com gráficos */}
        <Grid item xs={12} md={9} lg={10}>
          {/* Linha superior com 3 gráficos */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 2, height: 320, background: '#fff', boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Bar data={dados.faturamentoData} options={chartOptions('Faturamento')} height={260} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 2, height: 320, background: '#fff', boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Bar data={dados.acordosData} options={chartOptions('Nº de Acordos')} height={260} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 2, height: 320, background: '#fff', boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Bar data={dados.peData} options={chartOptions('P.E. / Adimplência / Antecipação de P.E. / Recuperação')} height={260} />
              </Paper>
            </Grid>
          </Grid>
          {/* Gráfico grande embaixo */}
          <Paper sx={{ p: 2, borderRadius: 2, mt: 3, height: 380, background: '#fff', boxShadow: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bar data={dados.grandeData} options={chartOptions('')} height={320} />
          </Paper>
          {/* Indicadores de Quitação */}
          <Grid container spacing={2} mb={3} justifyContent="center">
            {indicadoresQuitacao.map((ind) => (
              <Grid item xs={12} sm={6} md={3} key={ind.label}>
                <Paper sx={{ p: 2, borderRadius: 2, background: '#1976d2', color: '#fff', fontWeight: 700, textAlign: 'center', boxShadow: 2 }}>
                  <Typography variant="body2">{ind.label}</Typography>
                  <Typography variant="h6">{ind.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {/* Gráficos de Quitação */}
          <Grid container spacing={3} mb={3} justifyContent="center">
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2, background: '#fff', boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: '#1976d2', fontWeight: 700 }}>Indicadores de Quitação (Pizza)</Typography>
                <Pie data={quitacaoPieData} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2, background: '#fff', boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: '#1976d2', fontWeight: 700 }}>Quitação por Funcionário (Barras)</Typography>
                <Bar data={quitacaoBarData} options={chartOptions('Quitação por Funcionário')} height={260} />
              </Paper>
            </Grid>
          </Grid>
        </Grid>
        {/* Coluna lateral com indicadores principais */}
        <Grid item xs={12} md={3} lg={2}>
          <Stack spacing={3} sx={{ height: '100%', justifyContent: 'flex-start' }}>
            {indicadoresPrincipais.map((ind) => (
              <Paper key={ind.label} sx={{ p: 2, borderRadius: 2, background: '#fff', color: '#1976d2', fontWeight: 700, textAlign: 'center', boxShadow: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{ind.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{ind.value}</Typography>
              </Paper>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
