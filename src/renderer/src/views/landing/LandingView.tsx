import React, { useEffect, useState } from 'react'
import './LandingView.css'
import { Box, Card, createStyles, IconButton, Typography } from '@mui/material'
import {
  AddCard,
  CalculateSharp,
  CardGiftcard,
  CardMembership,
  CastSharp,
  Description,
  Inventory,
  People,
  Person
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const LandingView = () => {
  let iconStyle = createStyles({
    fontSize: '4rem'
  })
  const actionsList = [
    {
      label: 'Crear Cliente',
      icon: <Person className="action-icon" sx={iconStyle} />,
      desc: 'Registrar un nuevo cliente en el sistema',
      route: '/users-create'
    },
    {
      label: 'Crear Presupuesto',
      icon: <Description sx={iconStyle} />,
      desc: 'Generar un nuevo presupuesto para un cliente',
      route: '/users-create'
    },
    {
      label: 'Ver Clientes',
      icon: <People sx={iconStyle} />,
      desc: 'Consultar y gestionar informacion de los clientes',
      route: '/users'
    },
    {
      label: 'Ver Presupuestos',
      icon: <Inventory sx={iconStyle} />,
      desc: 'Consultar y gestionar presupuestos/prestamos existentes'
    },
    {
      label: 'Configurar intereses',
      icon: <CalculateSharp sx={iconStyle} />,
      desc: 'Configurar los intereses'
    },
    {
      label: 'Ver coutas',
      icon: <AddCard sx={iconStyle} />,
      desc: 'Ver coutas'
    }
  ]
  return (
    <div className="landing-container">
      <div className="header">
        <Typography className="title" sx={{ fontWeight: 'bold', fontSize: '30px' }}>
          Sistema de Gestíon NOVA
        </Typography>
        <Typography>Panel Principal - Bienvenido/a</Typography>
      </div>
      <Box className="actions-container">
        {actionsList.map((action, idx) => (
          <ActionCard key={action.label + idx} action={action} />
        ))}
      </Box>
    </div>
  )
}

export default LandingView

const ActionCard = ({ action }) => {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => {
        navigate(action.route)
      }}
    >
      <Box className="card">
        <IconButton sx={{ width: '5rem', height: '5rem', display: 'flex' }}>
          {action.icon}
        </IconButton>
        <Typography fontSize={'20px'}>{action.label}</Typography>
        <Typography fontSize={'12px'} color={'grey'}>
          {action.desc}
        </Typography>
      </Box>
    </div>
  )
}
