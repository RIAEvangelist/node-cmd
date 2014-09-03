var cmd=require('../cmd.js');

cmd.get(
    'pwd',
    function(data){
        console.log('the current working dir is : ',data)
    }
);

cmd.run('touch example.created.file');

cmd.get(
    'ls',
    function(data){
        console.log('the current dir contains these files :\n\n',data)
    }
);