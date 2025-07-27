import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Chip, Typography } from '@mui/material';
import { AllInbox } from '@mui/icons-material';
import { ApiService } from '../services/apiService';

export interface FilterTab {
  id: string;
  label: string;
  type: 'status' | 'all';
  value: string;
  count?: number;
  icon?: React.ReactNode;
}

interface FilterTabsProps {
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
  onContactsUpdate: (contacts: any[]) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ 
  selectedFilter, 
  onFilterChange, 
  onContactsUpdate 
}) => {
  const [tabs, setTabs] = useState<FilterTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    try {
      setLoading(true);
      
      // Tabs fixas
      const allTabs: FilterTab[] = [
        { 
          id: 'all-leads', 
          label: 'Todos os Leads', 
          type: 'all', 
          value: 'all',
          icon: <AllInbox />
        },
        { id: 'bot-ativo', label: 'Bot Ativo', type: 'status', value: 'lead_novo' },
        { id: 'finalizado', label: 'Finalizado', type: 'status', value: 'lead_sem_interesse' },
        { id: 'assumido-sdr', label: 'Assumido pelo SDR', type: 'status', value: 'lead_avancado' },
      ];

      setTabs(allTabs);

      // Carregar contatos do primeiro filtro
      if (allTabs.length > 0) {
        await loadContactsForFilter(allTabs[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContactsForFilter = async (filterId: string) => {
    try {
      const tab = tabs.find(t => t.id === filterId);
      if (!tab) return;

      let contacts: any[] = [];

      if (tab.type === 'status') {
        contacts = await ApiService.getLeadsByStatus(tab.value as any);
      } else if (tab.type === 'all') {
        contacts = await ApiService.getLeads();
      }

      onContactsUpdate(contacts);
    } catch (error) {
      console.error('Erro ao carregar contatos para filtro:', error);
    }
  };

  const handleTabChange = async (event: React.SyntheticEvent, newValue: string) => {
    onFilterChange(newValue);
    await loadContactsForFilter(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Carregando filtros...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs 
        value={selectedFilter} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minWidth: 'auto',
            px: 2,
            py: 1,
            textTransform: 'none',
            fontSize: '0.875rem',
          },
          '& .Mui-selected': {
            fontWeight: 'bold',
          }
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {tab.icon && tab.icon}
                <Typography variant="body2">{tab.label}</Typography>
                {tab.count !== undefined && (
                  <Chip 
                    label={tab.count} 
                    size="small" 
                    sx={{ 
                      height: '20px', 
                      fontSize: '0.75rem',
                      backgroundColor: 'primary.main',
                      color: 'white'
                    }} 
                  />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default FilterTabs; 