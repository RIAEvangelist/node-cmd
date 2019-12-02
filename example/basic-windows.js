var cmd=require('../cmd.js');

cmd.get(
    'cd',
    function(err,data){
        console.log(err);
        console.log('the current working dir is : ',data);
    }
);

cmd.run('touch example.created.file');

cmd.get(
    'dir',
    function(err,data){
        console.log(err);
        console.log('the current dir contains these files :\n\n',data)
    }
);

cmd.get(
    `
        git clone https://github.com/RIAEvangelist/node-cmd.git
        cd node-cmd
        ls
    `,
    function(err,data){
        console.log('the node-cmd clone dir contains these files :\n\n',data)
    }
);
