const config = require('../config/database');
const mysql = require('mysql');
const pool = mysql.createPool(config);
const alasql =  require('alasql')

pool.on('error',(err)=> {
    console.error(err);
});

module.exports ={
    async getData(req,res) {
        try {
            let response = []
            let join = req.body.join
            let innerJoin;
            let kolom = []
            let table = req.body.table
        const items = req.body.nodeData.map((item) => ({
            itemKey: item.key,
            itemId: item.id
          }))

          let test = (str,type) =>{
            return new Promise((resolve, reject)=>{
                pool.getConnection((err, connection) => {

                    if (err) throw err;

                    let str2 = "SELECT * FROM "

                    let columns = "SHOW COLUMNS FROM "
                    
                    let query = type==='data' ? str2.concat(str): columns.concat(str)

                    if(type === "data"){
                        query += " LIMIT 10"
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
                response[i].data = await test(items[i].itemId, "data")
                response[i].columns = await test(items[i].itemId, "column")

                
                let string = "CREATE TABLE "+items[i].itemId;
                let columns =" ( ";
                

                for(k=0;k<response[i].columns.length; k++){
                    // console.log(response[i].columns[k].Field, 'k')
                    kolom.push(items[i].itemId +"_"+response[i].columns[k].Field)
                    columns += response[i].columns[k].Field +" "+response[i].columns[k].Type+","
                    queryColumn += items[i].itemId +"."+response[i].columns[k].Field+" AS "+items[i].itemId+"_"+response[i].columns[k].Field+","
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

            res.send({
                transaction : true,
                data: data
            })
        } catch (error) {
            res.send({
                transaction : false,
                error: error
            })
        }
    },
}