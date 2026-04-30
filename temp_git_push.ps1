Set-Location "c:\Users\sridh\OneDrive\Desktop\final_SE"
Write-Output "PWD: $(Get-Location)"
git status --short --branch
if (
    (git rev-parse --is-inside-work-tree) -ne 'true'
) {
    Write-Output 'Not a git repo'
    exit 1
}
git add .
git commit -m "Deploy backend: update env and prepare render deployment" --allow-empty
Write-Output 'Commit done'
git push origin HEAD
Write-Output 'Push done'
