import os

filepath = 'c:/Users/chabl/OneDrive/Documentos/AutoguestApp/App_web/pages/cliente/buscar_talleres.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                // Seleccionar imagen de forma cíclica para variedad
                const imagen = imagenesWorkshop[index % imagenesWorkshop.length];

                const card = `
                    <div class="search-result-card">
                        <div class="card-image">
                            <img src="${imagen}" alt="${taller.nombre}" style="width:100%; height:100%; object-fit:cover;">"""

replacement = """                // Seleccionar imagen de forma cíclica para variedad (o foto propia del taller si existe)
                const imagenDefault = imagenesWorkshop[index % imagenesWorkshop.length];
                const imagen = taller.foto_perfil ? taller.foto_perfil : imagenDefault;

                const card = `
                    <div class="search-result-card">
                        <div class="card-image">
                            <img src="${imagen}" alt="${taller.nombre}" onerror="this.src='${imagenDefault}'" style="width:100%; height:100%; object-fit:cover;">"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target string not found in file")
