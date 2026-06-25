# Control de Deuda

App web para registrar pagos y compartir el progreso con tu aval.

## Requisitos

- Una cuenta gratis en [Supabase](https://supabase.com)
- Una cuenta en [GitHub](https://github.com)
- Alternativa: [Netlify](https://netlify.com) o [Vercel](https://vercel.com)

## Configuración paso a paso

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Clic en **"New project"**
3. Completa:
   - **Name:** `control-deuda`
   - **Database password:** anótala (la necesitas para después)
   - **Region:** la más cercana a ti
4. Espera a que termine la creación (~2 min)

### 2. Ejecutar el script SQL

1. En tu proyecto Supabase, ve a **SQL Editor**
2. Clic en **"New query"**
3. Abre el archivo `setup.sql` de este proyecto
4. Copia todo el contenido y pégalo en el editor
5. Clic en **"Run"** (o Ctrl+Enter)
6. Deberías ver `Success. No rows returned` en varias líneas

### 3. Obtener las credenciales

1. En Supabase, ve a **Project Settings > API**
2. Copia estos dos valores:
   - **Project URL** (algo como `https://xxx.supabase.co`)
   - **anon public key** (una cadena larga que empieza con `eyJ...`)
3. Abre el archivo `app.js` del proyecto
4. Reemplaza los valores al inicio del archivo:

```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co'
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui'
```

### 4. Probar localmente

Abre `index.html` en tu navegador. Deberías ver la app funcionando.

### 5. Subir a GitHub Pages

1. Crea un repo en GitHub llamado `deuda-cae`
2. En tu terminal:
```bash
cd ruta/deuda-cae
git init
git add .
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/deuda-cae.git
git push -u origin main
```
3. En GitHub, ve a **Settings > Pages**
4. En **Source**, selecciona `main` y `/ (root)`
5. Clic en **Save**
6. Espera 1-2 minutos y tu app estará en:
   `https://TU_USUARIO.github.io/deuda-cae`

### 6. Compartir con tu aval

Copia la URL de GitHub Pages y compártela. Tu aval verá toda la información pero no podrá modificar nada sin el PIN.

## PIN por defecto

El PIN inicial es: **1234**

Puedes cambiarlo desde la app en el panel de administración.

## Comandos básicos de la app

| Acción | Cómo hacerlo |
|---|---|
| Ver dashboard | Abrir la página |
| Administrar | Clic en "Administrar" e ingresar PIN |
| Inicializar deuda | Admin > Inicializar / Editar deuda |
| Registrar pago | Admin > Registrar pago |
| Editar pago | Admin > clic en "Editar" en la tabla |
| Eliminar pago | Admin > clic en "Eliminar" en la tabla |
| Exportar CSV | Clic en "Exportar CSV" |
| Compartir | Clic en "copiar enlace" |
