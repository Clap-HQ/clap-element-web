# Element Web - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying Element Web to Amazon EKS.

## Files

- **deployment.yaml**: Deployment configuration with 1 replica, resource limits, and health checks
- **service.yaml**: ClusterIP service exposing port 80
- **ingress.yaml**: ALB Ingress with HTTPS and health check configuration

## Deployment

### Automated Deployment (Recommended)

Use GitHub Actions workflow:

```bash
# Go to GitHub Actions tab in clap-element-web repository
# Run: "Clap - Build and Deploy to EKS"
# Select environment: dev / staging / production
```

The workflow will:
1. Build and push Docker image to ECR
2. Update EKS deployment with new image
3. Wait for rollout to complete
4. Provision ALB and configure DNS

### Manual Deployment

If you need to deploy manually:

```bash
# 1. Configure kubectl
aws eks update-kubeconfig --region ap-northeast-2 --name clap-eks-dev

# 2. Create namespace
kubectl create namespace clap

# 3. Replace environment placeholders
sed -i "s/ENV_TAG/dev/g" deployment.yaml
sed -i "s/ENV/dev/g" ingress.yaml

# 4. Apply manifests
kubectl apply -f deployment.yaml -n clap
kubectl apply -f service.yaml -n clap
kubectl apply -f ingress.yaml -n clap

# 5. Check deployment status
kubectl rollout status deployment/element-web -n clap
kubectl get pods -l app=element-web -n clap

# 6. Get ALB endpoint
kubectl get ingress element-web -n clap
```

## Configuration

### Environment Variables

The deployment uses the following environment variables:

- `ELEMENT_WEB_PORT`: HTTP port (default: 80)

### Resource Limits

- **Requests**: 250m CPU, 512Mi memory
- **Limits**: 500m CPU, 1Gi memory

### Health Checks

- **Liveness Probe**: GET /config.json every 30s
- **Readiness Probe**: GET /config.json every 10s

## Access

After deployment, Element Web is accessible at:

- **Dev**: https://app.dev.clap.ac
- **Staging**: https://app.staging.clap.ac
- **Production**: https://app.clap.ac

## Troubleshooting

### Check pod logs
```bash
kubectl logs -l app=element-web -n clap --tail=100 -f
```

### Check pod status
```bash
kubectl describe pod -l app=element-web -n clap
```

### Check ingress
```bash
kubectl describe ingress element-web -n clap
```

### Check ALB in AWS Console
```bash
aws elbv2 describe-load-balancers --region ap-northeast-2 \
  --query "LoadBalancers[?contains(LoadBalancerName, 'clap-eks-dev')].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}"
```

## Rollback

To rollback to previous version:

```bash
# View deployment history
kubectl rollout history deployment/element-web -n clap

# Rollback to previous revision
kubectl rollout undo deployment/element-web -n clap

# Rollback to specific revision
kubectl rollout undo deployment/element-web -n clap --to-revision=2
```

## Blue/Green Migration

During ECS to EKS migration, both deployments will coexist. Traffic is controlled via Route 53 weighted routing:

1. **Initial**: ECS 100%, EKS 0%
2. **Phase 1**: ECS 90%, EKS 10% (validation)
3. **Phase 2**: ECS 50%, EKS 50% (load testing)
4. **Phase 3**: ECS 0%, EKS 100% (complete migration)

Monitor metrics in CloudWatch and Grafana before proceeding to next phase.
