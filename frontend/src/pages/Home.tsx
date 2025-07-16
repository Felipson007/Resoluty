import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

const faturamento = [
  { title: 'Faturamento Anual', value: 'R$ 2450.00' },
  { title: 'Meta de Faturamento', value: '5.98' },
  { title: 'Faturamento (mensal)', value: 'R$275.978' },
];

export default function Home() {
  return (
    <Box p={4}>
      <Grid container spacing={4} justifyContent="flex-start">
        {faturamento.map((item) => (
          <Grid key={item.title}>
            <Card sx={{ background: '#B3E3E8', borderRadius: 3, boxShadow: 2, minHeight: 120, display: 'flex', alignItems: 'center', px: 4 }}>
              <CardContent sx={{ width: '100%' }}>
                <Typography variant="h6" fontWeight={600} color="#2D6156" mb={1}>{item.title}</Typography>
                <Typography variant="h3" fontWeight={700} color="#2D6156">{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 