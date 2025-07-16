import React from 'react';
import { Breadcrumbs, Typography, Link as MuiLink } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

const pathMap: Record<string, string> = {
  '/home': 'Home',
  '/gestao': 'Gestão',
  '/financeiro': 'Financeiro',
  '/comercial': 'Comercial',
  '/customer-success': 'Costumer Sucess',
  '/administrativo': 'Administrativo',
};

export default function BreadcrumbsNav() {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);
  let pathSoFar = '';

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 4, mt: 2, ml: 2, fontSize: 14 }}>
      {paths.length === 0 ? (
        <Typography color="text.primary">Home</Typography>
      ) : (
        paths.map((segment, idx) => {
          pathSoFar += '/' + segment;
          const isLast = idx === paths.length - 1;
          const label = pathMap[pathSoFar] || segment.charAt(0).toUpperCase() + segment.slice(1);
          return isLast ? (
            <Typography color="text.primary" key={pathSoFar}>{label}</Typography>
          ) : (
            <MuiLink component={Link} underline="hover" color="inherit" to={pathSoFar} key={pathSoFar}>
              {label}
            </MuiLink>
          );
        })
      )}
    </Breadcrumbs>
  );
} 