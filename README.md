# figma2css

Convert figma components in to react components

![](https://dl.dropboxusercontent.com/s/g271pk7p25o3x1n/ezgif.com-video-to-gif.gif?dl=0)


## installation

```
  npm install -g figma2css
```

## create CRA application
```
  create-react-app test-figma2css
```
you can use any name

## create the configuration file in the root of the project
```
  cd test-figma2css
  touch .figma2css
```

## insert your configuration
```
  //.figma2css

  {
    "projectId": <id of your project>,
    "token": <your figma developer token>
  }
```

you can findout how to get your token [here](https://www.figma.com/developers/docs#auth)

if you wanna test it out just use the test project, projectId: "eYk3d4ngtHUXkg82atfuJP"

## generate your components

inside your CRA project

```
  figma2css generate
```

## watch for changes in the figma project and generate the components

```
  figma2css watch
```


###### Marcell Monteiro Cruz - 2018
# 
