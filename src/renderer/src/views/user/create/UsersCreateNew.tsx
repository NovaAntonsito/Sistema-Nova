import { ArrowLeft } from '@mui/icons-material'
import { Box, Button, Container, TextField, Typography } from '@mui/material'
import { Field, FieldProps, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import type { CreateUserDto } from '@dto/user.dto'
const UsersCreateNew = () => {
  const navigate = useNavigate()

  const SignupSchema = Yup.object({
    email: Yup.string().email('Email inválido').required('El email es requerido'),
    nombre: Yup.string().required('El email es requerido'),
    phoneNumber: Yup.number().optional()
  })
  const initialValues: CreateUserDto = { email: '', nombre: '', phoneNumber: '' }
  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Box
        display={'flex'}
        justifyContent={'center'}
        flexDirection={'column'}
        alignItems={'flex-start'}
        gap={'2rem'}
        padding={'1rem'}
      >
        <Box display={'flex'} justifyContent={'center'} alignItems={'center'} gap={'1rem'}>
          <Button
            onClick={() => {
              navigate('/')
            }}
            variant="contained"
            sx={{ background: 'grey' }}
          >
            <ArrowLeft />
            Volver
          </Button>
          <Typography sx={{ fontWeight: 'bold', fontSize: '20px' }} textAlign={'center'}>
            Crear Nuevo Cliente
          </Typography>
        </Box>
        <Box
          sx={{ boxShadow: '1px 1px 10px rgba(0,0,0,0.4)' }}
          padding={'1rem'}
          borderRadius={'10px'}
        >
          <Formik
            initialValues={initialValues}
            validationSchema={SignupSchema}
            onSubmit={(values) => {
              console.log('Datos enviados:', values)
            }}
          >
            {({ errors, touched }) => (
              <Form>
                <Box display={'flex'} gap={'1rem'}>
                  <Field name="email">
                    {({ field }: FieldProps) => (
                      <TextField
                        {...field}
                        label="Email"
                        fullWidth
                        margin="normal"
                        error={Boolean(errors.email && touched.email)}
                        helperText={touched.email && errors.email}
                      />
                    )}
                  </Field>
                </Box>
                <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                  Enviar
                </Button>
              </Form>
            )}
          </Formik>
        </Box>
      </Box>
    </Container>
  )
}

export default UsersCreateNew
