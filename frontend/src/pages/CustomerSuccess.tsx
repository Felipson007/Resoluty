import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Stack, TextField, Button, Grid, AppBar, Toolbar, Avatar } from '@mui/material';
import { Bar, Pie, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MonetizationOn, TrendingUp, TrendingDown, Percent, Assignment, Star, WaterDrop, QrCode2, CalendarToday } from '@mui/icons-material';
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
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Adimplência',
        data: [3307.39, 4445.42],
        backgroundColor: '#26c6da',
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Antecipação de P.E.',
        data: [1127.88, 0],
        backgroundColor: '#ab47bc',
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Recuperação',
        data: [0, 2647.5],
        backgroundColor: '#8d6e63',
        barPercentage: 0.6,
        categoryPercentage: 0.6,
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

const chartOptions = (title: string, isPie = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: resolutyPalette.text, font: { size: 18 } },
    },
    title: { display: true, text: title, color: resolutyPalette.text, font: { size: 18, weight: 700 } },
    tooltip: { enabled: true },
    datalabels: {
      color: resolutyPalette.text,
      font: { weight: 700, size: 18 },
    },
  },
  ...(isPie ? {} : {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: resolutyPalette.text,
          font: { size: 18, weight: 700 },
          callback: function (tickValue: string | number) {
            if (typeof tickValue === 'number') {
              return tickValue >= 1000 ? `${(tickValue / 1000).toFixed(1)} mil` : tickValue;
            }
            return tickValue;
          },
        },
      },
      x: {
        ticks: {
          color: resolutyPalette.text,
          font: { size: 18, weight: 700 },
        },
      },
    },
  })
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
  background: '#FFFFFF', // Fundo geral branco
  sidebar: '#FFFFFF',    // Sidebar/Menu branco
  text: '#222222',       // Texto principal escuro
  textSecondary: '#757575', // Texto secundário cinza
  border: '#E0E0E0',     // Borda de cards cinza claro
  card: '#FFFFFF',       // Fundo dos cards/KPIs branco
  chartBg: '#FFFFFF',    // Fundo dos gráficos branco
  kpiHit: '#22C55E',     // KPI atingido
  kpiMiss: '#EF4444',    // KPI não atingido
  shadow: 'rgba(0,0,0,0.08)',
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
  hoverSidebar: '#F5F5F5',
  activeSidebar: '#E0E0E0',
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
  background: '#fff',
  color: '#222',
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
  const [data] = useState(getMockData());

  return (
    <Box sx={{ 
      background: resolutyPalette.background, 
      minHeight: '100vh', 
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
      {/* Header com filtro */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" sx={{ color: resolutyPalette.text, fontWeight: 700 }}>
          Customer Success
        </Typography>
        
      </Box>

      {/* KPIs */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: 2,
        mb: 3
      }}>
        {data.indicadores.slice(0, 7).map((kpi, index) => (
          <Paper key={index} sx={{ ...kpiStyle, background: resolutyPalette.card, border: `1.5px solid ${resolutyPalette.border}` }}>
            <Box sx={{ color: kpiColors[index], mb: 1 }}>
              {kpiIcons[index]}
            </Box>
            <Typography variant="h6" sx={{ color: resolutyPalette.text, fontWeight: 700, mb: 1 }}>
              {kpi.label}
            </Typography>
            <Typography variant="h5" sx={{ color: resolutyPalette.text, fontWeight: 700 }}>
              {kpi.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Gráficos */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 3
      }}>
        {/* Primeira linha - 2 gráficos */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3,
          flexWrap: 'wrap'
        }}>
          {/* Faturamento */}
          <Paper sx={{ 
            ...darkPaper, 
            flex: '1 1 45%',
            minWidth: 400,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Bar 
                data={data.faturamentoData} 
                options={chartOptions('Faturamento por Funcionário')}
              />
            </Box>
          </Paper>

          {/* Acordos */}
          <Paper sx={{
            ...darkPaper, 
            flex: '1 1 45%',
            minWidth: 400,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Bar 
                data={data.acordosData} 
                options={chartOptions('Número de Acordos por Funcionário')}
              />
            </Box>
          </Paper>
        </Box>

        {/* Segunda linha - 2 gráficos */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3,
          flexWrap: 'wrap'
        }}>
          {/* P.E/Adimplência */}
          <Paper sx={{ 
            ...darkPaper, 
            flex: '1 1 45%',
            minWidth: 400,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Bar 
                data={data.peData} 
                options={chartOptions('P.E/Adimplência por Funcionário')}
              />
            </Box>
          </Paper>

          {/* Grande */}
          <Paper sx={{ 
            ...darkPaper, 
            flex: '1 1 45%',
            minWidth: 400,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Bar 
                data={data.grandeData} 
                options={chartOptions('Grande por Funcionário')}
              />
            </Box>
          </Paper>
        </Box>

        {/* Terceira linha - 3 gráficos */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3,
          flexWrap: 'wrap'
        }}>
          {/* Quitação Geral */}
          <Paper sx={{ 
            ...darkPaper, 
            flex: '1 1 30%',
            minWidth: 300,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Pie 
                data={data.quitacaoData} 
                options={chartOptions('Quitação Geral', true)}
              />
            </Box>
          </Paper>

          {/* Média de Meses de Quitação */}
          <Paper sx={{ 
            ...darkPaper, 
            flex: '1 1 30%',
            minWidth: 300,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Pie 
                data={data.mesesQuitacaoData} 
                options={chartOptions('Média de Meses de Quitação', true)}
              />
            </Box>
          </Paper>

          {/* Vazão da Carteira */}
          <Paper sx={{ 
            ...darkPaper, 
            flex: '1 1 30%',
            minWidth: 300,
            p: 3,
            height: 400
          }}>
            <Box sx={{ height: '100%' }}>
              <Pie 
                data={data.vazaoCarteiraData} 
                options={chartOptions('Vazão da Carteira', true)}
              />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
