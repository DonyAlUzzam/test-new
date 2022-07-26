// const config = require('../config/database');
// const mysql = require('mysql');
// const pool = mysql.createPool(config);
const alasql =  require('alasql')
const db = require('mysql2-promise')();
const mysql = require('promise-mysql2');
const axios = require('axios');


// pool.on('error',(err)=> {
//     console.error(err);
// });

module.exports ={

    async getData(req,res) {
        try {
            let response = {}
            let join = req.body.join
            let innerJoin;
            let kolom = []
            let data = []
            let table = req.body.table
            let filter = req.body.filter
            let column = req.body.columns
            let queryColumn="";

            // console.log(req.body.filter, 'filter')

            const items = req.body.nodeData.map((item) => ({
                itemKey: item.key,
                itemId: item.id,
                columns: []
                // itemConfig: item.config
            }))

            const config = {
                headers: { Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IkFsbCBVc2VyIiwidXNlcl9pcCI6IjAuMC4wLjBcLzAifQ.__Id-5IeNkaiLjFPuHTI5uMPYLL68u6vKFgoX_USz28` }
            };

            let dataConfig = [];
                await axios.post('http://172.17.62.209:8088/bigenvelope/public/api/id/531', req.body, config)
                .then((res) => {
                    dataConfig = res.data
                }).catch((err) => {
                    console.error(err);
                });

                // await axios.post('http://172.17.62.209:8088//bigenvelope/public/api/id/526', req.body, config)

                const result = Object.keys(dataConfig).map((key) => [Number(key), dataConfig[key]]);

                console.log(result, 'res')
                result.forEach(f=> {
                    const tableFound = items.find(node=> node.itemId === f[1][0])
                   if(tableFound != undefined){
                     Object.keys(items).forEach(nodeKey=>{
                        if(items[nodeKey].itemId === tableFound.itemId){
                            items[nodeKey].itemConfig = f[1][1]
                        }
                    })
                   }
                })

                // if((column != undefined) && (column.length>0)){
                //     column.forEach(col=> {
                //         // const tableFound = items.find(node=> node.itemId === col.table)
                //             Object.keys(items).forEach(nodeKey=>{
                //                 if(items[nodeKey].itemId === col.table){
                //                     items[nodeKey].columns = col
                //                 }
                //             })
                //     })
                // }


           for(let i=0; i<items.length;i++){
                
                let connection = await mysql.createConnection({
                    "host": items[i].itemConfig.host,
                    "user": items[i].itemConfig.username,
                    "password": items[i].itemConfig.password,
                    "database": items[i].itemConfig.dbname
                });

                let str2="SELECT ";

                if((column != undefined) && (column.length>0)){
                    column.forEach(f=> {
                        // const tableFound = items.find(node=> node.itemKey === f.table)
                        if(items[i].itemId=== f.table){
                            // let condition = " WHERE "
                            // query = query.concat(condition)
                            // Object.keys(f.columns).forEach(indexColumn => {
                            //     where += ` ${f.columns[indexColumn]} = '${f.value[indexColumn]}' AND `
                            // });
                            str2 += ` ${f.name}, `
                        }
                       

                    })
                    str2 = str2.substring(0,str2.length-2)
                    str2 = `${str2} FROM `
                }else{
                     str2 = "SELECT * FROM "
                }

                let query;
                let where="";

                    // query = str2.concat(str, " WHERE ")
                query = str2.concat(items[i].itemKey)

                console.log(query, 'qeru')
                if((filter != undefined) && (filter.length>0)){
                    let condition = " WHERE "
                    query = query.concat(condition)
                    filter.forEach(f=> {
                        // const tableFound = items.find(node=> node.itemKey === f.table)
                        if(items[i].itemKey=== f.table){
                            
                            // Object.keys(f.columns).forEach(indexColumn => {
                                // where += ` ${f.columns[indexColumn]} = '${f.value[indexColumn]}' AND `
                                where += ` ${f.columns} ${f.operator} '${f.value}' AND `
                            // });
                        }
                    })
                    let whereColumn = where.substring(0,where.length-4)
                    query = query.concat(whereColumn)

                }else{
                    query = str2.concat(items[i].itemKey)
                }

                const [rows, fields] = await connection.query(query);
                connection.end();
                data[i] = {}
                data[i].table = items[i].itemKey 
                data[i].data = rows
                data[i].columns = fields

                let string = "CREATE TABLE  "+items[i].itemKey;
                let columns =" ( ";

                for(k=0;k<data[i].columns.length; k++){
                    kolom.push(data[i].columns[k].table +"_"+data[i].columns[k].name)
                    columns += data[i].columns[k].name +","
                    queryColumn += data[i].columns[k].table +"."+data[i].columns[k].name+" AS "+data[i].columns[k].table+"_"+data[i].columns[k].name+","
                }

                columns = columns.substring(0,columns.length)
                let replaced = columns.substring(columns.length-1, 0)
                replaced += ")";
                let queryAlasql = string + replaced
                queryAlasql = queryAlasql.toUpperCase()
                // console.log(data[i].data, 's')
                alasql(queryAlasql);
                alasql.tables[Object.keys(alasql.tables)[i]].data = data[i].data
                
           }

           queryColumn = queryColumn.substring(queryColumn.length-1, 0)
            let queryJoin;
            if((join != undefined) && (join.length > 0)){
                queryJoin = "SELECT "+queryColumn+" FROM "+table+" "+join[0].type+" "+join[0].table+" ON "+join[0].on[0][0]+" = "+join[0].on[0][1];
            }else{
                queryJoin = "SELECT "+queryColumn+" FROM "+table;
            }

            let count = alasql(`select count(*) as total from (${queryJoin})`)
            innerJoin  = alasql(queryJoin)

            for(let i=0; i<items.length;i++){
                alasql(`DROP TABLE ${items[i].itemKey}`)
            }

            response = {
                "totalData": count,
                "data" : innerJoin,
                "columns" : kolom,
            }

           res.send({
                transaction : true,
                data: response
            })
        } catch (error) {
            res.send({
                transaction : false,
                error: error.message
            })
        }
    },

    async getData2(req,res) {
        try {
            // console.log(req.body,'req')
            let response = []
            let join = req.body.join
            let innerJoin;
            let kolom = []
            let table = req.body.table
            let filter = req.body.filter
            const items = req.body.nodeData.map((item) => ({
                itemKey: item.key,
                itemId: item.id,
                itemConfig: item.config
                // itemsFilter : item.filter
            }))
            
            let test = (str,type, config) =>{
                return new Promise((resolve, reject)=>{
                    
                    let str2 = "SELECT * FROM "

                    let columns = "SHOW COLUMNS FROM "
                    let query;
                    let where="";

                    if(type === "data"){
                        // query = str2.concat(str, " WHERE ")
                        query = str2.concat(str)
                        if(filter.length>0){
                            filter.forEach(f=> {
                                // const tableFound = items.find(node=> node.itemKey === f.table)
                                if(str=== f.table){
                                    let condition = " WHERE "
                                    query = query.concat(condition)
                                    Object.keys(f.columns).forEach(indexColumn => {
                                        where += ` ${f.columns[indexColumn]} = '${f.value[indexColumn]}' AND `
                                    });
                                }
                            })
                            
                            let whereColumn = where.substring(0,where.length-4)
                            query = query.concat(whereColumn)

                        }else{
                            query = str2.concat(str)
                        }
                    }else{
                        query=columns.concat(str)
                    }

                   console.log(config, 'co')
                    // db.configure({
                        // "host": "172.17.62.52",
                        // "user": "demo",
                        // "password": "Demo@2020",
                        // "database": "demo"
                    // });
                    db.configure({
                        "host": config.host,
                        "user": config.user,
                        "password": config.password,
                        "database": config.database
                    });

                    // let data;

                    db.execute(query).spread(function (results) {
                        console.log(results, 'r')
                        resolve(results)
                    });
                    // db.execute(query, function (error, results) {
                    //     console.log(error, 'erpr')

                    //     console.log(results, 'er')
                    //     // if(error){
                    //     //     // throw error;
                    //     //     // res.send({transaction:false})
                    //     //     // return 
                    //     // }   
                    //      resolve(results)
                    // })
                    console.log(query, 'quer')

                    // const [rows, fields] = await db.execute(query).spread(function (results) {
                    //     resolve(results)
                    // });

                    // const [rows, fields] = await connection.query("SELECT * FROM PRODUCT");
                    // // connection.end();
                    // console.log(fields, 'wo');
                    // for(let i=0;i<fields.length;i++){
                    //     console.log(fields[i].name)
                    // }



                        // console.log(rows, 'r')
                })
            }

            let queryColumn="";
            for(let i=0; i<items.length; i++){
                response[i] = {}
                response[i].table = items[i].itemKey 
                response[i].data = await test(items[i].itemKey, "data", items[i].itemConfig)
                response[i].columns = await test(items[i].itemKey, "column", items[i].itemConfig)

                let string = "CREATE TABLE  "+items[i].itemKey;
                let columns =" ( ";
                
                for(k=0;k<response[i].columns.length; k++){
                    // console.log(response[i].columns[k].Field, 'k')
                    kolom.push(items[i].itemKey +"_"+response[i].columns[k].Field)
                    columns += response[i].columns[k].Field +" "+response[i].columns[k].Type+","
                    queryColumn += items[i].itemKey +"."+response[i].columns[k].Field+" AS "+items[i].itemKey+"_"+response[i].columns[k].Field+","
                }

                columns = columns.substring(0,columns.length)
                let replaced = columns.substring(columns.length-1, 0)
                replaced += ")";
                let query = string + replaced
                query = query.toUpperCase()
                
                alasql(query);
                alasql.tables[Object.keys(alasql.tables)[i]].data = response[i].data

            }

            queryColumn = queryColumn.substring(queryColumn.length-1, 0)
            let query2;
            if((join != undefined) && (join.length > 0)){
                query2 = "SELECT "+queryColumn+" FROM "+table+" "+join[0].type+" "+join[0].table+" ON "+join[0].on[0][0]+" = "+join[0].on[0][1];
            }else{
                query2 = "SELECT "+queryColumn+" FROM "+table;
            }

            innerJoin  = alasql(query2)
            data = {
                "data" : innerJoin,
                "columns" : kolom,
            }
            for(let i=0; i<items.length; i++){
                let queryCheck = 'DROP TABLE '+items[i].itemKey;
                alasql(queryCheck)
            }
            res.send({
                transaction : true,
                data: response
            })
        } catch (error) {
            res.send({
                transaction : false,
                error: error.message
            })
        }
    },

    async getDataNode(req,res) {
        try {
            let response = {}
            let join = req.body.join
            let innerJoin;
            let kolom = []
            let data = []
            let table = req.body.table
            let filter = req.body.filter
            let queryColumn="";

            const items = req.body.nodeData.map((item) => ({
                itemKey: item.key,
                itemId: item.id,
                itemConfig: item.config
            }))

           for(let i=0; i<items.length;i++){
               
                
                let connection = await mysql.createConnection({
                    "host": items[i].itemConfig.host,
                    "user": items[i].itemConfig.user,
                    "password": items[i].itemConfig.password,
                    "database": items[i].itemConfig.database
                });

                let str2 = "SELECT * FROM "

                let query;
                let where="";

                query = str2.concat(items[i].itemKey)
                if(filter.length>0){
                    filter.forEach(f=> {
                        if(items[i].itemKey=== f.table){
                            let condition = " WHERE "
                            query = query.concat(condition)
                            Object.keys(f.columns).forEach(indexColumn => {
                                where += ` ${f.columns[indexColumn]} = '${f.value[indexColumn]}' AND `
                            });
                        }
                    })
                    
                    let whereColumn = where.substring(0,where.length-4)
                    query = query.concat(whereColumn)

                }else{
                    query = str2.concat(items[i].itemKey)
                }

                const [rows, fields] = await connection.query(query);
                connection.end();
                data[i] = {}
                data[i].table = items[i].itemKey 
                data[i].data = rows
                data[i].columns = fields

                let string = "CREATE TABLE  "+items[i].itemKey;
                let columns =" ( ";

                for(k=0;k<data[i].columns.length; k++){
                    kolom.push(data[i].columns[k].table +"_"+data[i].columns[k].name)
                    columns += data[i].columns[k].name +","
                    queryColumn += data[i].columns[k].table +"."+data[i].columns[k].name+" AS "+data[i].columns[k].table+"_"+data[i].columns[k].name+","
                }

                columns = columns.substring(0,columns.length)
                let replaced = columns.substring(columns.length-1, 0)
                replaced += ")";
                let queryAlasql = string + replaced
                queryAlasql = queryAlasql.toUpperCase()
                
                alasql(queryAlasql);
                alasql.tables[Object.keys(alasql.tables)[i]].data = data[i].data
                
           }

           queryColumn = queryColumn.substring(queryColumn.length-1, 0)
            let queryJoin;
            if((join != undefined) && (join.length > 0)){
                queryJoin = "SELECT "+queryColumn+" FROM "+table+" "+join[0].type+" "+join[0].table+" ON "+join[0].on[0][0]+" = "+join[0].on[0][1];
            }else{
                queryJoin = "SELECT "+queryColumn+" FROM "+table;
            }

            console.log(queryJoin)

            innerJoin  = alasql(queryJoin)

            response = {
                "data" : innerJoin,
                "columns" : kolom,
            }

           res.send({
                transaction : true,
                data: response
            })
        } catch (error) {
            res.send({
                transaction : false,
                error: error.message
            })
        }
    },
   
}

// const mysql2 = require('promise-mysql2');

