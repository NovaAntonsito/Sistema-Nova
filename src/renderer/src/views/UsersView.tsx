import { Delete, Edit } from '@mui/icons-material'
import {
  Box,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import { getAllUsers } from '@renderer/services/UserService'
import  { useEffect, useState } from 'react'
import { UserResponseDto } from 'src/main/database/dto/user.dto'

const UsersView = () => {
  const [users, setUsers] = useState<UserResponseDto[]>([])
  const getData = async () => {
    await getAllUsers().then((res) => {
      console.log(res.data)
      setUsers(res.data)
    })
  }

  useEffect(() => {
    getData()
  }, [])
  useEffect(() => {
    console.log(users)
  }, [users])
  return (
    <Container
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexDirection: 'column',
        height: '100vh',
        gap: '2rem'
      }}
    >
      <Typography variant="h3" component="div">
        Usuarios
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell align="center">Nombre</TableCell>
              <TableCell align="center">Celular</TableCell>
              <TableCell align="center">Fecha de creación</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((row) => (
              <TableRow key={row.id} >
                <TableCell align="center">{row.nombre}</TableCell>
                <TableCell align="center">{row.phoneNumber}</TableCell>
                <TableCell align="center">{row.createdAt.toLocaleDateString()}</TableCell>
                <TableCell align="center">
                  <Box
                    width={'100%'}
                    display={'flex'}
                    justifyContent={'center'}
                            alignItems={'center'}
                  >
                    <Tooltip title={'Borrar usuario'}>
                      <IconButton>
                        <Delete sx={{ color: 'red' }}></Delete>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={'Editar usuario'}>
                      <IconButton>
                        <Edit sx={{ color: 'green' }}></Edit>
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}

export default UsersView
