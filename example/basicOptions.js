var cmd=require('../cmd.js');

cmd.get(
    'ipconfig',
    function(err,data){
        if(err) throw err;
        console.log('the output of ipconfig is : ',data)
    }
);

cmd.get(
    'ipconfig',
    {encoding: 'buffer'},
    function(err,data){
        if(err) throw err;
        console.log('the output of ipconfig (with options) is : ',data.toString('utf8'))
    }
);

cmd.run('touch example.created.file');
