const { prompt } = require('inquirer');
const { writeFile } = require('fs');

const questions = [
    {
        type: 'input',
        name: 'token',
        message: 'Discord bot token:',
        validate: (input) => {
            return new Promise((resolve, reject) => {
                if(input.match(/[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g))
                    resolve(true);
                else
                    reject('This is not a valid Discord bot token!');
            });
        }
    }
];

prompt(questions).then(answers => {
   console.log(`Generating your config.json...`);
   writeFile('config.json', JSON.stringify(answers, null, '\t'), err => {
       if(err)
           return console.log("Failed to generate config.json: ");

       console.log("Success! You're all set to run Sage.")
   });
});