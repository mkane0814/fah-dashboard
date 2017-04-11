#!/usr/bin/env bash

if [ ! -d "userDBTest" ]; then
  mkdir userDBTest
fi

mongod --dbpath userDBTest
