#!/bin/bash

# Répertoire source (racine du projet React Foundry)
SRC_DIR=$(pwd)

# Répertoire cible (chemin système de Foundry)
DEST_DIR=~/code/foundry/data/Data/systems/fvtt-mds

echo "Build de l'application"
npm run build

# Copie les fichiers nécessaires
cp -r public/* dist/

echo "🛠️  Déploiement du système dans: $DEST_DIR"

# Crée le dossier de destination s'il n'existe pas
mkdir -p "$DEST_DIR"

# On vide le dossier cible
rm -Rf "$DEST_DIR/*"

# Copie les fichiers nécessaires
cp -r dist/* "$DEST_DIR/"

chmod -R 777 "$DEST_DIR"

echo "✅ Déploiement terminé."