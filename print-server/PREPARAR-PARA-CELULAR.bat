@echo off
chcp 65001 > nul
echo ===========================================
echo   PREPARANDO ARQUIVOS PARA O CELULAR
echo ===========================================
echo.

echo [1/2] Criando arquivo ZIP...
cd ..
powershell -Command "Compress-Archive -Path 'print-server' -DestinationPath 'print-server-android.zip' -Force -CompressionLevel Optimal"

if exist "print-server-android.zip" (
    echo [2/2] Pronto!
    echo.
    echo ===========================================
    echo   Arquivo criado: print-server-android.zip
    echo ===========================================
    echo.
    echo Proximo passo:
    echo 1. Envie este ZIP para seu celular
    echo    ^(Google Drive, WhatsApp, Email, etc^)
    echo.
    echo 2. No celular:
    echo    - Extraia o ZIP
    echo    - Siga o guia: GUIA-INSTALACAO-ANDROID.md
    echo.
) else (
    echo ERRO: Falha ao criar ZIP
)

pause
