v='\e[1;32m'
r='\e[0m'
g='\e[37m'
gg='\e[1;37m'
a='\e[1;33m'

echo -e "${a}██╗  ██╗    ███████╗    ████████╗";
echo "╚██╗██╔╝    ██╔════╝    ╚══██╔══╝";
echo " ╚███╔╝     ███████╗       ██║   ";
echo " ██╔██╗     ╚════██║       ██║   ";
echo "██╔╝ ██╗    ███████║       ██║   ";
echo -e "╚═╝  ╚═╝    ╚══════╝       ╚═╝   ${r}";
echo
echo -e "${g}                                          Instalando Dependencias....${r}"
npm init -y
echo -e "${gg}                                         Dependencias instaladas ${r}"

echo -e "${g}                                          Instalando Librerias......${r}"
npm install @whiskeysockets/baileys pino @hapi/boom
echo -e "${gg}                                         Librerias instaladas${r}"

echo -e "${gg}                                         Abriendo indice......${r}"

echo -e "${a}██╗███╗   ██╗██████╗ ██╗ ██████╗███████╗";
echo "██║████╗  ██║██╔══██╗██║██╔════╝██╔════╝";
echo "██║██╔██╗ ██║██║  ██║██║██║     █████╗  ";
echo "██║██║╚██╗██║██║  ██║██║██║     ██╔══╝  ";
echo "██║██║ ╚████║██████╔╝██║╚██████╗███████╗";
echo -e "╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝ ╚═════╝╚══════╝${r}";
echo
echo -e "${v}            Crear nueva sesión"
echo -e "${gg} SESSION_ID=nombre_nuevo node XST.js"
echo 
echo 
echo -e "${v}           PM2"
echo -e "${gg} SESSION_ID=nombre pm2 start XST.js"
echo 
echo
echo -e "${v}           Borrar sesión"
echo -e "${gg} rm -rf ../auth_info_nombre"
