import React, { useState } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useNavigate } from 'react-router-dom';
import { csBackgroundColor, resolutyPalette } from '../pages/CustomerSuccess';
import Logo from '../logo.svg'; // Usar logo Resoluty

const sections = [
  {
    title: 'Home',
    items: [
      { text: 'Home', icon: <HomeIcon />, path: '/home' },
    ],
  },
  {
    title: 'Administrativo',
    items: [
      { text: 'Gestão', icon: <PeopleIcon />, path: '/gestao' },
      { text: 'Financeiro', icon: <BarChartIcon />, path: '/financeiro' },
    ],
  },
  {
    title: 'Geral',
    items: [
      { text: 'Comercial', icon: <TrendingUpIcon />, path: '/comercial' },
      { text: 'Costumer Sucess', icon: <SupportAgentIcon />, path: '/customer-success' },
      { text: 'Administrativo', icon: <MenuBookIcon />, path: '/administrativo' },
    ],
  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      open={open}
      PaperProps={{
        style: {
          width: 240,
          background: resolutyPalette.sidebar,
          color: resolutyPalette.text,
          borderRight: '1px solid #eee',
          paddingTop: 24,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
        <img src={Logo} alt="Resoluty Logo" style={{ height: 40 }} />
      </Box>
      <Box sx={{ px: 2 }}>
        {sections.map(section => (
          <Box key={section.title} mb={2}>
            <Typography variant="body2" color="textSecondary" fontWeight={500} mb={1} sx={{ pl: 1 }}>
              {section.title}
            </Typography>
            <List disablePadding>
              {section.items.map(item => (
                <ListItem
                  key={item.text}
                  onClick={() => navigate(item.path)}
                  sx={{
                    pl: 2,
                    mb: 0.5,
                    borderRadius: 1,
                    '&:hover': { background: resolutyPalette.hoverSidebar },
                    background: item.path === window.location.pathname ? resolutyPalette.activeSidebar : 'transparent',
                    color: item.path === window.location.pathname ? resolutyPalette.text : resolutyPalette.text,
                  }}
                  component="li"
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Drawer>
  );
} 