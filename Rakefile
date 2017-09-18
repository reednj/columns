
task :release do 
    sh 'git push --follow-tags prod master'
    sh' ssh reednj@paint.reednj.com touch /home/reednj/code/columns.git/tmp/restart.txt'
end
