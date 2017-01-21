var Family = require('../models/home');
var sync = require('synchronize')
var request = require('sync-request');
var barcodeCount = 1000000000000;
/*
input JSON
{
	familyName: 'asasda',
	name: 'Apurv',
	socialLoginId: 'dada231121',
	socialLoginType: 'Facebook' 
}
*/
exports.login = function(req, res) {
	if(req.body==null){
		res.status(403).json({err:'Invalid Login Information'});
	}
	else{
		Family.find({familyName: req.body.familyName},function(err, data){
			if (err) {console.log(err);res.status(500).json({error:err});}
			else if(data==null || data.length==0){
				/*var newUser = {
					name: req.body.name,
					socialLoginId: req.body.loginId,
					socialLoginType: req.body.loginType
				};
				var users = [];
				users.push(newUser);*/
				var newFamily = new Family({
					familyName: req.body.familyName,
					users: users
				});
				newFamily.save(function(err){
					if (err) {console.log(err);res.status(500).json({'err':err});}
					else{
						console.log(newFamily);
						res.status(200).json(newFamily);
					}
				});
				
			}else{
				var users = data.users.filter(function(u){
					return (u.socialLoginId==req.body.socialLoginId && u.socialLoginType==req.body.socialLoginType);
				});
				if(users.length==0){
					var newUser = {
						name: req.body.name,
						socialLoginId: req.body.loginId,
						socialLoginType: req.body.loginType
					};
					data.users.push(newUser);
				}
				res.status(200).json(data);
			}
		});
	}
}

/* input structure - 
{
	itemList: [
		{
			barcode: String
		}
	]	
}
*/
exports.addToFridge = function(req, res){
	if(req.body.itemList==null){
		res.send(403).json({error:'Barcodes incorrect'});
	}else{
		Family.findById(req.params.id, function(err, Family){
			if (err) {console.log(err);res.status(500).json({error:'Family not found'});}
			if(Family!=null){
				//sync()
				sync.fiber(function(){
					var currentDate = new Date();
					var items = req.body.itemList;
					var garbageItemsTobeRemoved=[];
					for(var i=0;i<items.length;i++){
						var product=null;
						console.log("here finding product");
						for(var j=0;j<Family.productList.length;j++){
							if(Family.productList[j].barcode == items[i].barcode){
								product = Family.productList[j];
								if(product.name==''){
									//this is if the user himself enters the name and description for the product 
									//when the user enters it manually for the product which only has barcode
									//now scanned by OCR
									product.name = items[i].name;
									product.description = items[i].description;
								}
								Family.productList[j].totalConsumed=Family.productList[j].totalConsumed+1;
							}
						}

						if(product==null){
							if(items[i].barcode!=null){//if the barcode is present
								//first find the product on UPC database
								var upcInfo = request('GET','http://api.upcdatabase.org/json/686805871a799c2b1a0e06e77a544fce/'+items[i].barcode);
								
								var bodyUPC = JSON.parse(upcInfo.getBody('utf8'));
								console.log(JSON.stringify(bodyUPC));
								if(bodyUPC.valid=='true'){
									var productText = bodyUPC.description;
									if(productText==""){
										productText = bodyUPC.itemname+bodyUPC.alias;
									}
									product = {
										created_date:currentDate,							
										updated_date:currentDate,
										name:productText,
										description:productText,
										barcode:items[i].barcode,
										totalConsumed:1
									}
									Family.productList.push(product);
								}else{
									//try once more by adding a 0 to the barcode and hit upc
									upcInfo = request('GET','http://api.upcdatabase.org/json/686805871a799c2b1a0e06e77a544fce/0'+items[i].barcode);
									var bodyUPC = JSON.parse(upcInfo.getBody('utf8'));
									console.log("with 0:"+JSON.stringify(bodyUPC));
									if(bodyUPC.valid=='true'){
										var productText = bodyUPC.description;
										if(productText==""){
											productText = bodyUPC.itemname+bodyUPC.alias;
										}
										product = {
											created_date:currentDate,							
											updated_date:currentDate,
											name:productText,
											description:productText,
											barcode:items[i].barcode,
											totalConsumed:1
										}
										Family.productList.push(product);
									}else{
										//if the UPC database does not have information on the barcode
										product = {
											created_date:currentDate,							
											updated_date:currentDate,
											name:'',
											description:'',
											barcode:items[i].barcode,
											totalConsumed:1
										}
										Family.productList.push(product);
									}
								}
							}else{
								//if barcode is not present , the data comes from calrifai api after image object detection
								product = {
									created_date:currentDate,							
									updated_date:currentDate,
									name:items[i].name,
									description:items[i].description,
									barcode:barcodeCount+1,
									totalConsumed:1
								}
								barcodeCount=barcodeCount+1;
								Family.productList.push(product);
							}
							
							
						}

						for(var gi=0;gi<Family.garbageList.length;gi++){
							//console.log("product:"+JSON.stringify(Family.fridgeList[fi]));
							//console.log("fi fridgelIst:"+Family.fridgeList);
							if(Family.garbageList[gi].product.barcode==items[i].barcode){
								Family.garbageList[gi].quantity=Family.garbageList[gi].quantity-1;
								if(Family.garbageList[gi].quantity){
									garbageItemsTobeRemoved.push(gi);
								}
								break;
							}/*else if(Family.garbageList[gi].product.name==items[i].name){
								Family.garbageList[gi].quantity=Family.garbageList[gi].quantity-1;
								if(Family.garbageList[gi].quantity){
									garbageItemsTobeRemoved.push(gi);
								}
								break;
							}*/
						}


						var isAFridgeItem = false;
						for(var fi=0;fi<Family.fridgeList.length;fi++){
							if(Family.fridgeList[fi].product.barcode==items[i].barcode){
								Family.fridgeList[fi].quantity=Family.fridgeList[fi].quantity+1;
								isAFridgeItem = true;
								break;
							}/*else if(Family.fridgeList[fi].product.name==items[i].name){
								Family.fridgeList[fi].quantity=Family.fridgeList[fi].quantity+1;
								isAFridgeItem = true;
								break;
							}*/
						}
						
						if(!isAFridgeItem){
							fridgeItem={
								created_date:currentDate,
								updated_date:currentDate,
								product:product,
								quantity:1
							};
							Family.fridgeList.push(fridgeItem);
						}
						
					}
					
					for(var k=0;k<garbageItemsTobeRemoved.length;k++){
						Family.garbageList = Family.garbageList.splice(garbageItemsTobeRemoved[k],1);
					}
					Family.save(function(err){
						if(err) { console.log(err); res.status(204).json({error:'Some error at the server'})}
						res.status(200).json(Family);
					});
					
				});
			}
		});
	}
}

/* input structure - 
{
	itemList: [
		{
			name: String,
			description: String,
			barcode: String
		}
	]
}
*/
exports.addToGarbage = function(req, res){
	if(req.body.itemList==null){
		res.send(403).json({error:'Barcodes incorrect'});
	}else{
		Family.findById(req.params.id, function(err, family){
			if (err) {console.log(err);res.status(500).json({error:'Family not found'});}
			if(family!=null){
				var currentDate = new Date();
				var fridgeItemsToBeRemoved=[];
				var items = req.body.itemList;
				for(var i=0;i<items.length;i++){

					var product=null;
					console.log("here finding product");
					for(var j=0;j<Family.productList.length;j++){
						if(Family.productList[j].barcode == items[i].barcode){
							var product = Family.productList[j];
						}
					}
					//to find the items to be updated in the fridgeList
					//if the quantity becomes 0 then remove from the fridgelist
					for(var gi=0;gi<Family.fridgeList.length;gi++){
						if(Family.fridgeList[gi].product.barcode==items[i].barcode){
							Family.fridgeList[gi].quantity=Family.fridgeList[gi].quantity-1;
							if(Family.fridgeList[gi].quantity){
								fridgeItemsToBeRemoved.push(gi);
							}
							break;
						}/*else if(Family.fridgeList[gi].product.name==items[i].name){
							Family.fridgeList[gi].quantity=Family.fridgeList[gi].quantity-1;
							if(Family.fridgeList[gi].quantity){
								fridgeItemsToBeRemoved.push(gi);
							}
							break;
						}*/
					}

					var isAGarbageItem = false;
					for(var fi=0;fi<Family.garbageList.length;fi++){
						
						if(Family.garbageList[fi].product.barcode==items[i].barcode){
							Family.garbageList[fi].quantity=Family.garbageList[fi].quantity+1;
							isAGarbageItem = true;
							break;
						}/*else if(Family.garbageList[fi].product.name==items[i].name){
							Family.garbageList[fi].quantity=Family.garbageList[fi].quantity+1;
							isAGarbageItem = true;
							break;
						}*/
					}
					
					
					
					if(!isAGarbageItem){
						garbageItem={
							created_date:currentDate,
							updated_date:currentDate,
							product:product,
							quantity:1
						};
						Family.garbageList.push(garbageItem);
					}
					
				}
				
				for(var k=0;k<fridgeItemsToBeRemoved.length;k++){
					Family.fridgeList = Family.fridgeList.splice(fridgeItemsToBeRemoved[k],1);
				}
				Family.save(function(err){
					if(err) { console.log(err); res.status(204).json({error:'Some error at the server'})}
					res.status(200).json(Family);
				});
			}
		});
	}
}

exports.getAllData = function(req,res){
	if(req.params.id==null){
		res.send(403).json({err:'Barcodes incorrect'});
	}else{
		console.log("here")
		Family.findById(req.params.id, function(err, family){
			if (err) {console.log(err);res.status(500).json({error:'Family not found'});}
			if(family!=null){
				res.status(200).json(family);
			}else{
				res.status(201).json({error:"Could not find Family"})
			}
		});
	}
}