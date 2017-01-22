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
				console.log(req.body);
				var newFamily = new Family({
					familyName: req.body.familyName
					//users: users
				});
				newFamily.save(function(err){
					if (err) {console.log(err);res.status(500).json({'err':err});}
					else{
						console.log(newFamily);
						res.status(200).json(newFamily);
					}
				});
				
			}else{
				/*var users = data.users.filter(function(u){
					return (u.socialLoginId==req.body.socialLoginId && u.socialLoginType==req.body.socialLoginType);
				});
				if(users.length==0){
					var newUser = {
						name: req.body.name,
						socialLoginId: req.body.loginId,
						socialLoginType: req.body.loginType
					};
					data.users.push(newUser);
				}*/
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
	if(req.body.itemList==null || req.body.itemList.length==0){
		res.status(403).json({error:'Barcodes incorrect'});
		return;
	}else{
		console.log("add to fridge:"+JSON.stringify(req.body.itemList));
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
						if(items[i].quantity!=null){
							items[i].quantity = parseInt(items[i].quantity);
						}
						console.log("items:"+JSON.stringify(items[i]));
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
									description:items[i].name,
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
								if(Family.garbageList[gi].quantity<0){
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
								var productQuantity = 1;
								if(items[i].quantity!=null){
									product.name = items[i].name;
									product.description = items[i].name;
									productQuantity = 0;
									Family.fridgeList[fi].product.name = items[i].name;
									Family.fridgeList[fi].product.description = items[i].description;
								}

								Family.fridgeList[fi].quantity=Family.fridgeList[fi].quantity+productQuantity;
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
						Family.garbageList.splice(garbageItemsTobeRemoved[k],1);
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
	console.log(req.body.itemList);
	if(req.body.itemList==null || req.body.itemList.length==0){
		res.status(403).json({error:'Barcodes incorrect'});
	}else{
		console.log("add to garbage:"+JSON.stringify(req.body.itemList));
		Family.findById(req.params.id, function(err, Family){
			if (err) {console.log(err);res.status(500).json({error:'Family not found'});}
			if(Family!=null){
				var currentDate = new Date();
				var fridgeItemsToBeRemoved=[];
				var items = req.body.itemList;

				for(var i=0;i<items.length;i++){
					if(items[i].quantity!=null){
							items[i].quantity = parseInt(items[i].quantity);
					}
					var product=null;
					for(var j=0;j<Family.productList.length;j++){
						if(Family.productList[j].barcode == items[i].barcode){
							product = Family.productList[j];
						}
					}
					if(product==null){
						console.log("Invalid product while adding to garbage");
						res.status(500).json({error:'Invalid product'});
						return;
					}
					//to find the items to be updated in the fridgeList
					//if the quantity becomes 0 then remove from the fridgelist
					var isPresentInFridge = false;
					for(var gi=0;gi<Family.fridgeList.length;gi++){
						console.log(Family.fridgeList[gi].product.barcode+"      "+items[i].barcode);
						if(Family.fridgeList[gi].product.barcode==items[i].barcode){
							isPresentInFridge=true;
							Family.fridgeList[gi].quantity=Family.fridgeList[gi].quantity-1;
							if(Family.fridgeList[gi].quantity==0){
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
					if(!isPresentInFridge){
						console.log('Item removed was not added to fridge');
						res.status(500).json({error:'Item removed was not added to fridge'});
						return;
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
					Family.fridgeList.splice(fridgeItemsToBeRemoved[k],1);
				}
				console.log(Family.fridgeList);
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
		res.status(403).json({error:'Barcodes incorrect'});
	}else{
		Family.findById(req.params.id, function(err, family){
			if (err) {console.log(err);res.status(500).json({error:'Family not found'});}
			if(family!=null){
				res.status(200).json(family);
				return;
			}else{
				res.status(404).json({error:"Could not find Family"});
			}
		});
	}
}

/*
{
	upcCodes:[
		{
			"code":"11231221123",
			"quantity":3
		}
	]
}
*/
exports.amazonCall = function(req,res){
	console.log("upcCodes:"+JSON.stringify(req.body));
	if(req.params.id==null || req.body==null){
		res.status(403).json({error:'Incorrect data sent'});
	}else{
		Family.findById(req.params.id, function(err, Family){
			if (err) {console.log(err);res.status(500).json({error:'Family not found'});}

			if(Family!=null && upcCodes!=null && upcCodes.length>0){
				var asin = "";
				var upcCodes = req.body.upcCodes;
				for(var i=0;i<upcCodes.length;i++){
					var z = request('GET','http://198.199.121.16/'+upcCodes[i].code);
					if(z!=null && z!=''){
						asin = asin+"ASIN."+(i+1)+"="+z.getBody('utf8')+"&"+"Quantity."+(i+1)+"="+upcCodes[i].quantity+"&";
					}
					for(var fi=0;fi<Family.garbageList.length;fi++){
								
						if(Family.garbageList[fi].product.barcode==z.getBody('utf8').code){
							Family.garbageList.splice(fi,1);
							break;
						}/*else if(Family.garbageList[fi].product.name==items[i].name){
							Family.garbageList[fi].quantity=Family.garbageList[fi].quantity+1;
							isAGarbageItem = true;
							break;
						}*/
					}
				}
				var data = {
					url:'https://www.amazon.com/gp/aws/cart/add.html?'+asin+'AWSAccessKeyId=AKIAJ34LUZETTZFXGMDQ&AssociateTag=aries0a-20'
				}
				res.status(200).json(data);
			}
		});
	}
}
