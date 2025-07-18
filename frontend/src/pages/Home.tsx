import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { csBackgroundColor, resolutyPalette } from './CustomerSuccess';

const faturamento = [
  { title: 'Faturamento Anual', value: 'R$ 2450.00' },
  { title: 'Meta de Faturamento', value: '5.98' },
  { title: 'Faturamento (mensal)', value: 'R$275.978' },
];

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', background: resolutyPalette.background, color: resolutyPalette.text }}>
      <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 3, py: 4 }}>
        {faturamento.map((item) => (
          <Card key={item.title} sx={{ background: '#B3E3E8', borderRadius: 3, boxShadow: 2, minHeight: 120, minWidth: 260, maxWidth: 400, display: 'flex', alignItems: 'center', px: 4, flex: '1 1 30%' }}>
            <CardContent sx={{ width: '100%' }}>
              <Typography variant="h6" fontWeight={600} color="#2D6156" mb={1}>{item.title}</Typography>
              <Typography variant="h3" fontWeight={700} color="#2D6156">{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
} 