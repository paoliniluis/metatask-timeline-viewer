const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream(process.argv[2]);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    let tasks = []
    let groupNames = []
    for await (const line of rl) {
        if (line.match('INFO sync.') || line.match('DEBUG sync.') || line.match('WARN sync.') || line.match('INFO sync.')) {
            if (line.match('STARTING') || line.match('FINISHED')) {
                info = line.substring(line.indexOf(' :: ')+4, line.length).replace(' step ', '');
                sof = info.substring(5, 13);
                time = line.substring(0, 19);
                databaseId = info.substring(info.indexOf('Database ')+9, info.length)
                databaseName = databaseId.substring(databaseId.indexOf(' ') + 2, databaseId.length)
                databaseName = databaseName.substring(0, databaseName.indexOf('\''))
                databaseId = databaseId.substring(0, databaseId.indexOf(' '))
                task = info.substring(15, info.indexOf(' \''))
                task = task.substring(0, task.indexOf(' for')).replace('\'', '').toLowerCase()
                grouping = task.substring(0,4)
                if (sof == 'STARTING') {
                    tasks.push({
                        'task': task,
                        'databaseId': databaseId,
                        'databaseName': databaseName,
                        'group': databaseName,
                        'start': time,
                        'title': `${task}`,
                        'content': `${task}`,
                    })
                    groupNames.push(databaseName)
                } else {
                    for (let i = 0; i < tasks.length; i++) {
                        if (tasks[i].task == task && tasks[i].databaseId == databaseId && !('end' in tasks[i])) {
                            tasks[i].end = time;
                            break;
                        }
                    }
                }
            }
        }
    }
    groupNames = [...new Set(groupNames)]
    
    let groups = []
    for (let g = 0; g < groupNames.length; g++) {
        groups.push({id: groupNames[g], content: groupNames[g]});
    }

    fs.writeFileSync('timeline.html', `
    <!doctype html>
        <html>
            <head>
                <title>Timeline</title>
                <script type="text/javascript" src="https://unpkg.com/vis-timeline@latest/standalone/umd/vis-timeline-graph2d.min.js"></script>
                <link href="https://unpkg.com/vis-timeline@latest/styles/vis-timeline-graph2d.min.css" rel="stylesheet" type="text/css" />
                <style>
                    body, html {
                    font-family: arial, sans-serif;
                    font-size: 11pt;
                    }
                
                    #visualization {
                    box-sizing: border-box;
                    width: 100%;
                    height: 100%;
                    }
                </style>
            </head>
        <body>
            <p>
                <button onclick="showAllGroups()">Restore Hidden</button>
            </p>
            <div id="visualization"></div>
            <script type="text/javascript">
                // DOM element where the Timeline will be attached
                var container = document.getElementById('visualization');

                // Create a DataSet (allows two way data-binding)
                let groupNames = new vis.DataSet(${JSON.stringify(groups)})
                let items = new vis.DataSet(${JSON.stringify(tasks)});

                // Configuration for the Timeline
                let options = {
                    stack: false,
                    groupTemplate: function(group){
                        var container = document.createElement('div');
                        var label = document.createElement('span');
                        label.innerHTML = group.content + ' ';
                        container.insertAdjacentElement('afterBegin',label);
                        var hide = document.createElement('button');
                        hide.innerHTML = 'hide';
                        hide.style.fontSize = 'small';
                        hide.addEventListener('click',function(){
                            groupNames.update({id: group.id, visible: false});
                        });
                        container.insertAdjacentElement('beforeEnd',hide);
                        return container;
                      },
                };

                // Create a Timeline
                let timeline = new vis.Timeline(container, items, groupNames, options);
            </script>
        </body>
    </html>
    `)
}

processLineByLine();