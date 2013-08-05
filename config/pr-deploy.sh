#!/bin/sh

WEB=~/games.popacular.com
SRC=~/code/columns.git
CONFIG=~/code/config_backup/redditgold

# copy the required files to the website
rm -rf $WEB/*
cp -R $SRC/* $WEB
rm -rf $WEB/sh
cp $CONFIG/db.rb $WEB/config/

mkdir $WEB/tmp
touch $WEB/tmp/restart.txt

echo "Website deployed"
