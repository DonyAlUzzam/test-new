const config = require('../config/database');
const mysql = require('mysql');
const pool = mysql.createPool(config);
const alasql =  require('alasql')
// const db = require('mysql2-promise')();

pool.on('error',(err)=> {
    console.error(err);
});

module.exports ={
    async getData(req,res) {
        try {

            db.configure({
                "host": "localhost",
                "user": "foo",
                "password": "bar",
                "database": "db"
            });

            let response = []
            let join = req.body.join
            let innerJoin;
            let kolom = []
            let table = req.body.table
            let filter = req.body.filter
        const items = req.body.nodeData.map((item) => ({
            itemKey: item.key,
            itemId: item.id,
            itemsFilter : item.filter
          }))

          let test = (str,type) =>{
            return new Promise((resolve, reject)=>{
                pool.getConnection((err, connection) => {

                    if (err) throw err;

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

                    connection.query(query, function (error, results) {
                        if(error){
                            throw error
                            // res.send({transaction:false})
                            // return 
                        }   
                         resolve(results)
                    })

                    connection.release();
                })
            })
          }
            let queryColumn="";
            for(let i=0; i<items.length; i++){
                response[i] = {}
                response[i].table = items[i].itemKey 
                response[i].data = await test(items[i].itemKey, "data")
                response[i].columns = await test(items[i].itemKey, "column")

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
            // console.log(alasql.tables, 'tab')
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
                data: data
            })
        } catch (error) {
            res.send({
                transaction : false,
                error: error.message
            })
        }
    },
}